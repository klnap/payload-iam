export { isRootRole, ROOT_ROLE_NAME, type RootRoleRef } from '#iam/core/rbac/is-root-role'

/** Bootstrap data — grants live in code (`effectiveIsRoot`), not in JSON. */
export const ROOT_PERMISSIONS = {
  collections: {},
  globals: {},
  register: {},
} as const
