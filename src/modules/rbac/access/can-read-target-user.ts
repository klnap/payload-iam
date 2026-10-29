import type { PayloadRequest } from 'payload'
import type { RolePermissions } from '#iam/core/permissions/role-permissions'
import { isPermissionsSubset } from '#iam/core/permissions/subset'
import { resolveCallerCeiling } from '#iam/modules/rbac/domain/ceiling'
import { effectiveIsRoot, effectivePermissions } from './can'

type UserDoc = {
  id?: string | number
  roles?: unknown
  isActive?: boolean
  type?: string
}

/** Lower roles cannot read/update users with effectively higher permissions. */
export function canCallerAccessTargetUser(
  caller: UserDoc | null | undefined,
  target: UserDoc | null | undefined
): boolean {
  if (!caller || !target) return false
  if (String(caller.id) === String(target.id)) return true

  const ceiling = resolveCallerCeiling(caller as never)
  if (ceiling === 'root') return true
  if (effectiveIsRoot(target as never)) return false

  const targetPerms = effectivePermissions(target as never)
  if (!targetPerms) return true
  if (ceiling === null) return false

  return isPermissionsSubset(targetPerms, ceiling as RolePermissions)
}

export async function loadUserForAccessCheck(
  req: PayloadRequest,
  usersSlug: string,
  id: string
): Promise<UserDoc | null> {
  try {
    return (await req.payload.findByID({
      collection: usersSlug,
      id,
      depth: 1,
      overrideAccess: true,
      req,
    })) as UserDoc
  } catch {
    return null
  }
}
