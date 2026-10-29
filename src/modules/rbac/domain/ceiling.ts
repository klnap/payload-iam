import type { RolePermissions } from '#iam/core/permissions/role-permissions'
import { isPermissionsSubset } from '#iam/core/permissions/subset'
import { isRootRole } from '#iam/modules/bootstrap/index'
import { effectiveIsRoot, effectivePermissions } from '#iam/modules/rbac/access/can'

type UserLike = {
  roles?: Array<{ name?: string; permissions?: RolePermissions } | string>
  isActive?: boolean
  type?: string
}

export type RoleLike = {
  id?: string | number
  name?: string
  permissions?: RolePermissions | null
}

export const ROLE_PERMS_BEYOND_CEILING = 'Cannot grant permissions beyond your own' as const
export const ROLE_CREATE_PERMS_BEYOND_CEILING =
  'Cannot create a role with permissions beyond your own' as const
export const ROLE_OUTSIDE_CEILING = 'Cannot modify a role with permissions beyond your own' as const
export const INVITE_ROLE_BEYOND_CEILING =
  'Cannot invite with a role that has permissions beyond your own' as const
export const INVITE_ROOT_ROLE = 'Cannot assign Root role via invite' as const

/** Caller's ceiling — `root` bypasses all subset checks. */
export function resolveCallerCeiling(
  user: UserLike | null | undefined
): RolePermissions | 'root' | null {
  if (!user) return null
  if (effectiveIsRoot(user as never)) return 'root'
  return effectivePermissions(user as never)
}

/**
 * True when caller may assign/view this role's permission bag.
 * Root always; non-root needs permissions ⊆ ceiling. Root roles never assignable.
 */
export function roleWithinCallerCeiling(
  role: RoleLike,
  ceiling: RolePermissions | 'root' | null
): boolean {
  if (isRootRole(role)) return false
  if (ceiling === 'root') return true
  return isPermissionsSubset(role.permissions, ceiling)
}

/** Invite / role-picker options capped to caller's ceiling. */
export function filterRolesWithinCeiling<T extends RoleLike>(
  roles: T[],
  user: UserLike | null | undefined
): T[] {
  const ceiling = resolveCallerCeiling(user)
  return roles.filter((r) => roleWithinCallerCeiling(r, ceiling))
}

/** Role ids the caller must not see/manage via list filters (above ceiling + Root). */
export function roleIdsOutsideCallerCeiling(
  roles: RoleLike[],
  ceiling: RolePermissions | 'root' | null
): string[] {
  if (ceiling === 'root') return []
  return roles
    .filter((r) => !roleWithinCallerCeiling(r, ceiling))
    .map((r) => String(r.id))
    .filter((id) => id.length > 0 && id !== 'undefined')
}

/** Invite API — throws if any role exceeds caller (or is Root). */
export function assertRolesAssignable(roles: RoleLike[], user: UserLike | null | undefined): void {
  const ceiling = resolveCallerCeiling(user)
  for (const role of roles) {
    if (isRootRole(role)) throw new Error(INVITE_ROOT_ROLE)
    if (ceiling === 'root') continue
    if (!roleWithinCallerCeiling(role, ceiling)) {
      throw new Error(INVITE_ROLE_BEYOND_CEILING)
    }
  }
}

/** Role update — caller may only edit roles whose current bag ⊆ ceiling. */
export function assertRoleEditable(role: RoleLike, user: UserLike | null | undefined): void {
  const ceiling = resolveCallerCeiling(user)
  if (ceiling === 'root') return
  if (!user) throw new Error(ROLE_OUTSIDE_CEILING)
  if (isRootRole(role)) throw new Error(ROLE_OUTSIDE_CEILING)
  if (!roleWithinCallerCeiling(role, ceiling)) {
    throw new Error(ROLE_OUTSIDE_CEILING)
  }
}

/** Roles create/update — throws when permissions exceed caller. */
export function assertRolePermissionsWithinCeiling(
  permissions: RolePermissions | null | undefined,
  user: UserLike | null | undefined,
  operation: 'create' | 'update'
): void {
  const ceiling = resolveCallerCeiling(user)
  if (ceiling === 'root') return
  if (!user) return
  if (isPermissionsSubset(permissions, ceiling)) return
  throw new Error(
    operation === 'create' ? ROLE_CREATE_PERMS_BEYOND_CEILING : ROLE_PERMS_BEYOND_CEILING
  )
}

/** Matrix: keep entities caller can touch. */
export function filterEntitySlugsByCeiling(
  slugs: string[],
  kind: 'collections' | 'globals',
  ceiling: RolePermissions | 'root' | null
): string[] {
  if (ceiling === 'root') return slugs
  if (!ceiling) return []
  const bag = ceiling[kind] ?? {}
  return slugs.filter((slug) => {
    const row = bag[slug]
    if (!row) return false
    return Object.entries(row).some(([k, v]) => k !== 'fields' && v === true)
  })
}
