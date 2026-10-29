import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { orderAdvisoryLocks } from '#iam/adapters/pg/locks'
import { sortUnique } from '#iam/core/identity/sort-unique'
import { ensureRootRole } from '#iam/modules/bootstrap/index'
import { effectiveIsRoot } from '#iam/modules/rbac/access/can'
import type { Actor, HostRuntimeDeps } from '#iam/types/config'

function roleIdsFromUser(user: { roles?: unknown }): string[] {
  if (!Array.isArray(user.roles)) return []
  return sortUnique(
    user.roles.flatMap((r) => {
      if (r == null) return []
      if (typeof r === 'string' || typeof r === 'number') return [String(r)]
      if (typeof r === 'object' && 'id' in r && r.id != null)
        return [String((r as { id: unknown }).id)]
      return []
    })
  )
}

const rolesUpdateContext = { payloadRbacOp: 'USER_ROLES_UPDATE' as const }

async function updateUserRoles(
  payload: Awaited<ReturnType<typeof hostPayload>>,
  userId: string,
  roleIds: string[]
): Promise<void> {
  await runWithInternalOperation(
    {
      kind: 'USER_ROLES_UPDATE',
      model: 'users',
      targetId: userId,
      fields: ['roles'],
    },
    async () => {
      await payload.update({
        collection: 'users',
        id: userId,
        data: { roles: roleIds },
        overrideAccess: true,
        context: rolesUpdateContext,
      })
    }
  )
}

export function createTransferRoot(host: HostRuntimeDeps) {
  return async function transferRoot(args: {
    targetUserId: string
    actor: Actor
  }): Promise<{ ok: true }> {
    if (args.actor.type !== 'human') {
      throw new Error('Only a signed-in administrator can transfer Root')
    }
    const actorUserId = args.actor.userId
    const targetUserId = args.targetUserId.trim()
    if (!targetUserId) throw new Error('targetUserId required')
    if (actorUserId === targetUserId) {
      throw new Error('Cannot transfer Root to yourself')
    }

    const payload = await hostPayload(host)
    const actorDoc = (await payload.findByID({
      collection: 'users',
      id: actorUserId,
      depth: 1,
      overrideAccess: true,
    })) as { roles?: unknown; isActive?: boolean } | null
    if (!actorDoc || !effectiveIsRoot(actorDoc as never)) {
      throw new Error('Only Root can transfer Root')
    }

    const targetDoc = (await payload.findByID({
      collection: 'users',
      id: targetUserId,
      depth: 1,
      overrideAccess: true,
    })) as {
      roles?: unknown
      isActive?: boolean
      provisioningStatus?: string
    } | null
    if (!targetDoc) throw new Error('User not found')
    if (targetDoc.isActive === false) {
      throw new Error('Cannot transfer Root to an inactive user')
    }
    if (targetDoc.provisioningStatus === 'provisioning') {
      throw new Error('Cannot transfer Root while user is provisioning')
    }
    if (effectiveIsRoot(targetDoc as never)) {
      throw new Error('User already has Root')
    }

    const rootRole = await ensureRootRole(payload)
    const rootRoleId = rootRole.id

    const actorRoleIds = roleIdsFromUser(actorDoc)
    const targetRoleIds = roleIdsFromUser(targetDoc)

    if (!actorRoleIds.includes(rootRoleId)) {
      throw new Error('Only Root can transfer Root')
    }

    const actorRolesAfter = sortUnique(actorRoleIds.filter((id) => id !== rootRoleId))
    if (actorRolesAfter.length === 0) {
      throw new Error(
        'Assign yourself another role before transferring Root (you cannot remain without a role)'
      )
    }

    const targetRolesAfter = sortUnique([...targetRoleIds, rootRoleId])

    const locks = orderAdvisoryLocks([
      { kind: 'AUTHZ_ROOT_GUARD' },
      { kind: 'USER_LIFECYCLE_GUARD', userId: actorUserId },
      { kind: 'USER_LIFECYCLE_GUARD', userId: targetUserId },
      { kind: 'ROLE_GUARD', roleId: rootRoleId },
    ])

    await host.withAdvisoryLocks(locks, async () => {
      const actorAgain = (await payload.findByID({
        collection: 'users',
        id: actorUserId,
        depth: 1,
        overrideAccess: true,
      })) as { roles?: unknown } | null
      if (!actorAgain || !effectiveIsRoot(actorAgain as never)) {
        throw new Error('Only Root can transfer Root')
      }

      const targetAgain = (await payload.findByID({
        collection: 'users',
        id: targetUserId,
        depth: 1,
        overrideAccess: true,
      })) as { roles?: unknown; isActive?: boolean; provisioningStatus?: string } | null
      if (!targetAgain) throw new Error('User not found')
      if (effectiveIsRoot(targetAgain as never)) {
        throw new Error('User already has Root')
      }

      // Demote first — prefer a brief zero-Root window under advisory lock over dual-Root.
      await updateUserRoles(payload, actorUserId, actorRolesAfter)
      try {
        await updateUserRoles(payload, targetUserId, targetRolesAfter)
      } catch (err) {
        // Restore actor Root if target promotion fails.
        try {
          await updateUserRoles(payload, actorUserId, actorRoleIds)
        } catch {
          // Leave zero-Root for operator recovery (CLI bootstrap) rather than dual-Root.
        }
        throw err
      }
    })

    host.onAudit?.({
      type: 'root_transferred',
      fromUserId: actorUserId,
      toUserId: targetUserId,
      actor: args.actor,
    })

    return { ok: true }
  }
}
