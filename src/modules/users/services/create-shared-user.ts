import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { normalizeEmail } from '#iam/adapters/email/email'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { orderAdvisoryLocks } from '#iam/adapters/pg/locks'
import { newId } from '#iam/core/identity/ids'
import {
  provisioningOperationIdFromKey,
  provisioningOperationIdFromUserId,
  provisioningRequestHash,
} from '#iam/core/identity/provisioning-id'
import { sortUnique } from '#iam/core/identity/sort-unique'
import { isRootRole } from '#iam/modules/bootstrap/index'
import { abandonInviteProvisioningUser, issueInviteReset } from '#iam/modules/invitations/index'
import type { Actor, HostRuntimeDeps } from '#iam/types/config'

const createOpContext = { payloadRbacOp: 'USER_CREATE' as const }

export type CreateSharedUserInput = {
  email: string
  fullName: string
  /** Prefer roleIds; roleId kept for callers mid-migration */
  roleId?: string
  roleIds?: string[]
  actor: Actor
  /** Exactly one of idempotencyKey | id (deterministic userId) */
  idempotencyKey?: string
  id?: string
  /**
   * Bootstrap / provision without invitation.
   * User ends active with roles; caller may setPassword immediately.
   */
  skipInvite?: boolean
}

function callerIdOf(actor: Actor): string {
  if (actor.type === 'human') return actor.userId
  if (actor.type === 'service') return `service:${actor.id}`
  return `system:${actor.reason}`
}

export function createCreateSharedUser(host: HostRuntimeDeps, facade: AuthUsersFacade) {
  return async function createSharedUser(input: CreateSharedUserInput) {
    const email = normalizeEmail(input.email)
    if (!input.fullName?.trim()) throw new Error('fullName required')
    const roleIds = sortUnique(
      input.roleIds?.length ? input.roleIds : input.roleId ? [input.roleId] : []
    )
    if (roleIds.length === 0) throw new Error('roleIds required')

    const fullName = input.fullName.trim()

    // If skipInvite is NOT true, we do NOT create the user in `users` or Better Auth yet.
    if (!input.skipInvite) {
      const payload = await hostPayload(host)

      const byEmail = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (byEmail.docs.length > 0) {
        const existing = byEmail.docs[0] as {
          id?: string | number
          provisioningStatus?: string
          isActive?: boolean
        }
        if (existing.isActive !== false && existing.provisioningStatus !== 'provisioning') {
          throw new Error('email already provisioned')
        }
        // Stale legacy anchor — clean up
        if (existing.id != null) {
          await abandonInviteProvisioningUser(host, facade, String(existing.id))
        }
      }

      const liveInvite = await payload.find({
        collection: 'invitations',
        where: {
          and: [{ email: { equals: email } }, { status: { equals: 'pending' } }],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (liveInvite.docs.length > 0) {
        throw new Error('live invitation exists for email')
      }

      for (const rid of roleIds) {
        const role = await payload.findByID({
          collection: 'roles',
          id: rid,
          depth: 0,
          overrideAccess: true,
        })
        if (!role) throw new Error('role not found')
        if (isRootRole(role as { name?: string })) {
          if (input.actor.type !== 'system') {
            throw new Error('cannot assign root via User.create')
          }
        }
      }

      const issued = await issueInviteReset(host, facade, {
        email,
        fullName,
        roleIds,
        actor: input.actor,
        reason: 'create',
      })

      return {
        email,
        invitationId: issued.invitationId,
        inviteUrl: issued.inviteUrl,
      }
    }

    // skipInvite: true path (bootstrap / direct user creation)
    const hasKey = Boolean(input.idempotencyKey)
    const hasId = Boolean(input.id)
    if (hasKey === hasId) {
      if (!hasKey && !hasId) {
        input = { ...input, id: newId() }
      } else {
        throw new Error('provide exactly one of idempotencyKey | id')
      }
    }

    const callerId = callerIdOf(input.actor)
    const userId = input.id ?? newId()
    const operationId = input.idempotencyKey
      ? provisioningOperationIdFromKey(callerId, input.idempotencyKey)
      : provisioningOperationIdFromUserId(callerId, userId)
    const requestHash = provisioningRequestHash({
      email,
      fullName,
      roleIds,
    })

    const phaseA = await host.withAdvisoryLocks(
      orderAdvisoryLocks([
        { kind: 'EMAIL_PROVISION_GUARD', email },
        { kind: 'USER_LIFECYCLE_GUARD', userId },
        ...roleIds.map((roleId) => ({
          kind: 'ROLE_GUARD' as const,
          roleId,
        })),
      ]),
      async () =>
        runWithInternalOperation(
          {
            kind: 'USER_CREATE',
            model: 'users',
            targetId: userId,
            fields: [
              'id',
              'email',
              'fullName',
              'roles',
              'isActive',
              'provisioningStatus',
              'provisioningOperationId',
              'provisioningRequestHash',
            ],
            provisioningOperationId: operationId,
          },
          async () => {
            const payload = await hostPayload(host)

            const byOp = await payload.find({
              collection: 'users',
              where: { provisioningOperationId: { equals: operationId } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            })
            const existingOp = byOp.docs[0] as
              | {
                  id: string
                  email: string
                  provisioningStatus?: string
                  provisioningRequestHash?: string
                }
              | undefined
            if (existingOp) {
              if (existingOp.provisioningRequestHash !== requestHash) {
                throw new Error('idempotency hash mismatch')
              }
              if (existingOp.provisioningStatus === 'none') {
                return {
                  mode: 'done' as const,
                  id: String(existingOp.id),
                  email: normalizeEmail(String(existingOp.email)),
                }
              }
              if (existingOp.provisioningStatus === 'provisioning') {
                return {
                  mode: 'resume' as const,
                  id: String(existingOp.id),
                  email: normalizeEmail(String(existingOp.email)),
                }
              }
              throw new Error('idempotency ownership mismatch')
            }

            const byEmail = await payload.find({
              collection: 'users',
              where: { email: { equals: email } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            })
            if (byEmail.docs.length > 0) {
              const existing = byEmail.docs[0] as {
                id?: string | number
                provisioningStatus?: string
                isActive?: boolean
              }
              const isOrphanAnchor =
                existing.provisioningStatus === 'provisioning' && existing.isActive === false
              if (!isOrphanAnchor || existing.id == null) {
                throw new Error('email already provisioned')
              }
              await abandonInviteProvisioningUser(host, facade, String(existing.id))
            }

            for (const rid of roleIds) {
              const role = await payload.findByID({
                collection: 'roles',
                id: rid,
                depth: 0,
                overrideAccess: true,
              })
              if (!role) throw new Error('role not found')
              if (isRootRole(role as { name?: string })) {
                if (input.actor.type !== 'system') {
                  throw new Error('cannot assign root via User.create')
                }
              }
            }

            const created = await payload.create({
              collection: 'users',
              data: {
                id: userId,
                email,
                fullName,
                roles: roleIds,
                isActive: false,
                provisioningStatus: 'provisioning',
                provisioningOperationId: operationId,
                provisioningRequestHash: requestHash,
              },
              overrideAccess: true,
              context: createOpContext,
            })
            if (String(created.id) !== userId) {
              throw new Error('allowIDOnCreate postcondition failed')
            }
            return { mode: 'created' as const, id: userId, email }
          }
        )
    )

    if (phaseA.mode === 'done') {
      return { id: phaseA.id, email: phaseA.email }
    }

    const sharedId = phaseA.id

    await runWithInternalOperation(
      {
        kind: 'FACADE_CREATE_USER',
        userId: sharedId,
        provisioningOperationId: operationId,
      },
      async () => {
        const { ensureBaUserMatchesPayload } = await import(
          '#iam/adapters/better-auth/ensure-ba-user'
        )
        await ensureBaUserMatchesPayload(facade, {
          userId: sharedId,
          email,
          name: fullName,
        })
      }
    )

    // Immediate activation (bootstrap / provision without invitation)
    await host.withAdvisoryLocks(
      orderAdvisoryLocks([
        { kind: 'EMAIL_PROVISION_GUARD', email },
        { kind: 'USER_LIFECYCLE_GUARD', userId: sharedId },
        ...roleIds.map((roleId) => ({
          kind: 'ROLE_GUARD' as const,
          roleId,
        })),
      ]),
      async () =>
        runWithInternalOperation(
          {
            kind: 'USER_PROVISIONING_FINALIZE',
            model: 'users',
            targetId: sharedId,
            fields: ['roles', 'isActive', 'provisioningStatus'],
          },
          async () => {
            const payload = await hostPayload(host)
            const anchor = (await payload.findByID({
              collection: 'users',
              id: sharedId,
              depth: 0,
              overrideAccess: true,
            })) as {
              provisioningStatus?: string
              isActive?: boolean
              provisioningOperationId?: string
              provisioningRequestHash?: string
            } | null
            if (
              anchor?.provisioningStatus !== 'provisioning' ||
              anchor.isActive !== false ||
              anchor.provisioningOperationId !== operationId ||
              anchor.provisioningRequestHash !== requestHash
            ) {
              throw new Error('Phase C fence failed')
            }
            await payload.update({
              collection: 'users',
              id: sharedId,
              data: {
                roles: roleIds,
                isActive: true,
                provisioningStatus: 'none',
              },
              overrideAccess: true,
              context: { payloadRbacOp: 'USER_PROVISIONING_FINALIZE' },
            })
          }
        )
    )

    return { id: sharedId, email }
  }
}
