/** Fixed root role — package invariant. Exactly one row named Root; never delete / rename. */
export const ROOT_ROLE_NAME = 'Root' as const

export type RootRoleRef = {
  name?: unknown
}

/** Runtime root detection — not stored as a boolean flag on the role document. */
export function isRootRole(role: RootRoleRef | null | undefined): boolean {
  if (!role) return false
  const name = typeof role.name === 'string' ? role.name.trim() : ''
  return name === ROOT_ROLE_NAME
}
