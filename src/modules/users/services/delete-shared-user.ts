import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { orderAdvisoryLocks } from '#iam/adapters/pg/locks'
import { sortUnique } from '#iam/core/identity/sort-unique'
import { isRootRole } from '#iam/modules/bootstrap/index'
import { type InvitationStatus, transitionInvitation } from '#iam/modules/invitations'
import type { Actor, HostRuntimeDeps } from '#iam/types/config'

function roleIdsFromUser(user: { roles?: unknown; role?: unknown }): string[] {
  if (Array.isArray(user.roles)) {
    return sortUnique(
      user.roles.map((r) =>
        typeof r === 'object' && r && 'id' in r ? String((r as { id: string }).id) : String(r)
      )
    )
  }
  if (user.role) {
    const r = user.role
    return [typeof r === 'object' && r && 'id' in r ? String((r as { id: string }).id) : String(r)]
  }
  return []
}

export function createDeleteSharedUser(host: HostRuntimeDeps, facade: AuthUsersFacade) {
  return async function deleteSharedUser(args: { userId: string; actor: Actor }) {
    // Phase A — durable deleting intent
    const targetRoles = await host.withAdvisoryLocks(
      orderAdvisoryLocks([
        { kind: 'USER_LIFECYCLE_GUARD', userId: args.userId },
        { kind: 'AUTHZ_ROOT_GUARD' },
      ]),
      async () => {
        const payload = await hostPayload(host)
        const user = (await payload.findByID({
          collection: 'users',
          id: args.userId,
          depth: 1,
          overrideAccess: true,
        })) as {
          isActive?: boolean
          provisioningStatus?: string
          roles?: unknown
          role?: unknown
        } | null
        if (!user) return null
        if (user.provisioningStatus === 'provisioning') {
          throw new Error('cannot delete while provisioning')
        }
        const ids = roleIdsFromUser(user)
        return ids
      }
    )
    if (targetRoles === null) return { ok: true }

    await host.withAdvisoryLocks(
      orderAdvisoryLocks([
        { kind: 'USER_LIFECYCLE_GUARD', userId: args.userId },
        { kind: 'AUTHZ_ROOT_GUARD' },
        ...targetRoles.map((roleId) => ({
          kind: 'ROLE_GUARD' as const,
          roleId,
        })),
      ]),
      async () =>
        runWithInternalOperation(
          {
            kind: 'USER_PROVISIONING_UPDATE',
            model: 'users',
            targetId: args.userId,
            fields: ['isActive', 'provisioningStatus'],
          },
          async () => {
            const payload = await hostPayload(host)
            const user = (await payload.findByID({
              collection: 'users',
              id: args.userId,
              depth: 1,
              overrideAccess: true,
            })) as {
              isActive?: boolean
              provisioningStatus?: string
              roles?: Array<{ name?: string } | string>
            } | null
            if (!user) return

            const roleDocs = Array.isArray(user.roles)
              ? user.roles.filter((r): r is { name?: string } => typeof r === 'object' && r != null)
              : []
            if (roleDocs.some((r) => isRootRole(r))) {
              throw new Error('Cannot delete Root Admin')
            }

            const invites = await payload.find({
              collection: 'invitations',
              where: {
                and: [{ userId: { equals: args.userId } }, { status: { equals: 'pending' } }],
              },
              limit: 50,
              depth: 0,
              overrideAccess: true,
            })
            for (const inv of invites.docs) {
              await transitionInvitation(host, {
                id: String(inv.id),
                from: inv.status as InvitationStatus,
                to: 'superseded',
                terminalReason: 'user-deleted',
              })
            }

            await payload.update({
              collection: 'users',
              id: args.userId,
              data: {
                isActive: false,
                provisioningStatus: 'deleting',
              },
              overrideAccess: true,
            })
          }
        )
    )

    // Phase B — BA, no locks
    await runWithInternalOperation(
      { kind: 'FACADE_DELETE_USER', userId: args.userId },
      async () => {
        const { deleteBaUserPreferIdThenEmail } = await import(
          '#iam/adapters/better-auth/ensure-ba-user'
        )
        const payload = await hostPayload(host)
        const doc = (await payload.findByID({
          collection: 'users',
          id: args.userId,
          depth: 0,
          overrideAccess: true,
        })) as { email?: string } | null
        await deleteBaUserPreferIdThenEmail(facade, {
          userId: args.userId,
          email: doc?.email,
        })
      }
    )

    // Phase C — hard-delete
    await host.withAdvisoryLocks(
      orderAdvisoryLocks([
        { kind: 'USER_LIFECYCLE_GUARD', userId: args.userId },
        { kind: 'AUTHZ_ROOT_GUARD' },
        ...targetRoles.map((roleId) => ({
          kind: 'ROLE_GUARD' as const,
          roleId,
        })),
      ]),
      async () =>
        runWithInternalOperation(
          {
            kind: 'USER_DELETE',
            model: 'users',
            targetId: args.userId,
            fields: [],
          },
          async () => {
            const payload = await hostPayload(host)
            const user = (await payload.findByID({
              collection: 'users',
              id: args.userId,
              depth: 0,
              overrideAccess: true,
            })) as { provisioningStatus?: string } | null
            if (!user) return
            if (user.provisioningStatus !== 'deleting') {
              throw new Error('Phase C fence failed')
            }
            await payload.delete({
              collection: 'users',
              id: args.userId,
              overrideAccess: true,
              context: { localizedDeleteConfirmed: true },
            })
          }
        )
    )

    return { ok: true }
  }
}
