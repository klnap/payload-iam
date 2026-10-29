import {
  canAccessAdmin,
  canCallerAccessTargetUser,
  pluginCollectionPermission,
} from '#iam/modules/rbac'

type AdminUser = Parameters<typeof canAccessAdmin>[0]

type TargetUserDoc = {
  id?: string | number
  roles?: unknown
  isActive?: boolean
  type?: string
}

export function canListUserSessions(args: {
  actor: AdminUser | null | undefined
  targetUserId: string
  usersCollectionSlug: string
  /**
   * Target user doc for ceiling checks when managing someone else's sessions.
   * Required for other-user access — without it, other-user listing is denied.
   */
  target?: TargetUserDoc | null
}): boolean {
  const { actor, targetUserId, usersCollectionSlug } = args
  if (!actor || !canAccessAdmin(actor)) return false
  const actorId = String((actor as { id?: string | number }).id ?? '')
  if (!actorId) return false
  if (actorId === targetUserId) return true
  if (!pluginCollectionPermission(actor, usersCollectionSlug, 'update')) return false
  if (args.target === undefined) return false
  return canCallerAccessTargetUser(actor as never, args.target)
}

export function canRevokeUserSession(args: {
  actor: AdminUser | null | undefined
  targetUserId: string
  usersCollectionSlug: string
  target?: TargetUserDoc | null
}): boolean {
  return canListUserSessions(args)
}
