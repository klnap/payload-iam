import { hasBaAdminSession } from '#iam/core/auth/ba-admin-session'
import { canAccessAdmin, effectiveIsRoot, type RbacAccessUser } from './can'

function roleCount(user: RbacAccessUser): number {
  return Array.isArray(user.roles) ? user.roles.length : 0
}

/** `/api/users/me` omits server-only `authChannel` — client guard uses role assignment as session signal. */
function hasClientBaSession(user: RbacAccessUser): boolean {
  if (hasBaAdminSession(user)) return true
  if (user.isActive === false) return false
  if (user.provisioningStatus && user.provisioningStatus !== 'none') return false
  return roleCount(user) > 0
}

function canAccessAdminClient(user: RbacAccessUser): boolean {
  if (!user || user.isActive === false) return false
  if (user.provisioningStatus && user.provisioningStatus !== 'none') return false
  if (user.type === 'service') return false
  if (effectiveIsRoot(user)) return true
  return roleCount(user) > 0
}

/** Client + server check: fully verified admin panel session (not OAuth/loading placeholders). */
export function isAdminPanelUser(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false
  const u = user as RbacAccessUser & { id?: unknown; email?: unknown }
  if (u.id == null || String(u.id).length === 0) return false
  if (!String(u.email ?? '').trim()) return false
  if (!hasBaAdminSession(u)) return false
  return canAccessAdmin(u)
}

/** `AdminSessionGuard` — same intent as {@link isAdminPanelUser} without requiring `authChannel` on `/me`. */
export function isClientAdminPanelUser(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false
  const u = user as RbacAccessUser & { id?: unknown; email?: unknown }
  if (u.id == null || String(u.id).length === 0) return false
  if (!hasClientBaSession(u)) return false
  return canAccessAdminClient(u)
}

type ClientAdminPermissions = { canAccessAdmin?: boolean } | null | undefined

function hasVerifiedAdminIdentity(
  user: unknown
): user is RbacAccessUser & { id: unknown; email?: string } {
  if (!user || typeof user !== 'object') return false
  const u = user as RbacAccessUser & { id?: unknown; email?: unknown }
  if (u.id == null || String(u.id).length === 0) return false
  // Prefer email when present; `/me` historically stripped it without `users.read`.
  return true
}

/**
 * Admin shell (guard, footer) — prefer Payload `/access` (`canAccessAdmin`) so a `/me`
 * response missing `roles` does not log the user out after BA sign-in.
 */
export function canUseAdminShell(user: unknown, permissions: ClientAdminPermissions): boolean {
  if (!hasVerifiedAdminIdentity(user)) return false
  if (permissions?.canAccessAdmin === true) return true
  return isClientAdminPanelUser(user)
}
