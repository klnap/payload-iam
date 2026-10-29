import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { findDocById } from '#iam/adapters/payload/find-doc-by-id'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { orderAdvisoryLocks } from '#iam/adapters/pg/locks'
import { sortUnique } from '#iam/core/identity/sort-unique'
import type { InvitationStatus } from '#iam/modules/invitations/domain/state-machine'
import { transitionInvitation } from '#iam/modules/invitations/services/invitation-transition'
import { abandonInviteProvisioningUser } from '#iam/modules/invitations/services/provisioning/abandon-provisioning-user'
import type { Actor, HostRuntimeDeps } from '#iam/types/config'

/** Invitation.expire — NO EMAIL (matrix). */
export function createExpireInvitation(host: HostRuntimeDeps, facade: AuthUsersFacade) {
  return async function expireInvitation(args: { invitationId: string; actor: Actor }) {
    const payload = await hostPayload(host)
    const inv = (await payload.findByID({
      collection: 'invitations',
      id: args.invitationId,
      depth: 0,
      overrideAccess: true,
    })) as {
      status: InvitationStatus
      userId?: string | null
      email: string
      authorizedRoleIds?: string[]
      expiresAt?: string
    } | null
    if (!inv) throw new Error('not found')
    if (inv.status !== 'pending') throw new Error('not pending')

    const roleIds = sortUnique((inv.authorizedRoleIds ?? []).map(String))
    const callerRoles: string[] = [] // freeze caller roles when human actor available later

    const lockList: Array<
      | { kind: 'EMAIL_PROVISION_GUARD'; email: string }
      | { kind: 'USER_LIFECYCLE_GUARD'; userId: string }
      | { kind: 'ROLE_GUARD'; roleId: string }
    > = [
      { kind: 'EMAIL_PROVISION_GUARD', email: inv.email },
      ...sortUnique([...callerRoles, ...roleIds]).map((roleId) => ({
        kind: 'ROLE_GUARD' as const,
        roleId,
      })),
    ]
    if (inv.userId) {
      lockList.push({ kind: 'USER_LIFECYCLE_GUARD', userId: inv.userId })
    }

    return host.withAdvisoryLocks(orderAdvisoryLocks(lockList), async () =>
      runWithInternalOperation(
        {
          kind: 'INVITATION_EXPIRE',
          model: 'invitations',
          targetId: args.invitationId,
          fields: ['status', 'activeUserId', 'terminalReason', 'version'],
        },
        async () => {
          let wasProvisioning = false
          if (inv.userId) {
            const user = await findDocById<{ provisioningStatus?: string }>(payload, {
              collection: 'users',
              id: inv.userId,
            })
            wasProvisioning = user?.provisioningStatus === 'provisioning'
          }
          const done = await transitionInvitation(host, {
            id: args.invitationId,
            from: 'pending',
            to: 'expired',
            terminalReason: 'natural-expiry',
          })
          if (!done.ok) throw new Error('cas miss')
          if (wasProvisioning && inv.userId) {
            await abandonInviteProvisioningUser(host, facade, inv.userId)
          }
          return { ok: true }
        }
      )
    )
  }
}

/** Invitation.revoke — NO EMAIL (matrix). */
export function createRevokeInvitation(host: HostRuntimeDeps, facade: AuthUsersFacade) {
  return async function revokeInvitation(args: { invitationId: string; actor: Actor }) {
    const payload = await hostPayload(host)
    const inv = (await payload.findByID({
      collection: 'invitations',
      id: args.invitationId,
      depth: 0,
      overrideAccess: true,
    })) as {
      status: InvitationStatus
      userId?: string | null
      email: string
      authorizedRoleIds?: string[]
    } | null
    if (!inv) throw new Error('not found')
    if (inv.status !== 'pending') throw new Error('not pending')

    const roleIds = sortUnique((inv.authorizedRoleIds ?? []).map(String))

    const lockList: Array<
      | { kind: 'EMAIL_PROVISION_GUARD'; email: string }
      | { kind: 'USER_LIFECYCLE_GUARD'; userId: string }
      | { kind: 'ROLE_GUARD'; roleId: string }
    > = [
      { kind: 'EMAIL_PROVISION_GUARD', email: inv.email },
      ...roleIds.map((roleId) => ({ kind: 'ROLE_GUARD' as const, roleId })),
    ]
    if (inv.userId) {
      lockList.push({ kind: 'USER_LIFECYCLE_GUARD', userId: inv.userId })
    }

    return host.withAdvisoryLocks(orderAdvisoryLocks(lockList), async () =>
      runWithInternalOperation(
        {
          kind: 'INVITATION_REVOKE',
          model: 'invitations',
          targetId: args.invitationId,
          fields: ['status', 'activeUserId', 'terminalReason', 'version'],
        },
        async () => {
          let wasProvisioning = false
          if (inv.userId) {
            const user = await findDocById<{ provisioningStatus?: string }>(payload, {
              collection: 'users',
              id: inv.userId,
            })
            wasProvisioning = user?.provisioningStatus === 'provisioning'
          }
          const done = await transitionInvitation(host, {
            id: args.invitationId,
            from: 'pending',
            to: 'superseded',
            terminalReason: 'revoke',
          })
          if (!done.ok) throw new Error('cas miss')
          if (wasProvisioning && inv.userId) {
            await abandonInviteProvisioningUser(host, facade, inv.userId)
          }
          return { ok: true }
        }
      )
    )
  }
}
