export const RBAC_MODULE_IDS = ['auth', 'bootstrap', 'rbac', 'invitations', 'users'] as const

export type RbacModuleId = (typeof RBAC_MODULE_IDS)[number]

/** Per-module enable flags. Omitted or `true` keeps a module enabled. */
export type RbacModulesToggle = Partial<Record<RbacModuleId, boolean>>

export type ResolvedRbacModules = Record<RbacModuleId, boolean>

export function resolveRbacModules(toggle?: RbacModulesToggle): ResolvedRbacModules {
  return {
    auth: toggle?.auth !== false,
    bootstrap: toggle?.bootstrap !== false,
    rbac: toggle?.rbac !== false,
    invitations: toggle?.invitations !== false,
    users: toggle?.users !== false,
  }
}

export function validateRbacModulesToggle(toggle?: RbacModulesToggle): ResolvedRbacModules {
  const resolved = resolveRbacModules(toggle)
  if (!resolved.auth) {
    throw new Error('rbac: modules.auth cannot be disabled')
  }
  if (!resolved.rbac) {
    throw new Error('rbac: modules.rbac cannot be disabled')
  }
  if (resolved.invitations && !resolved.users) {
    throw new Error('rbac: modules.invitations requires modules.users')
  }
  if (resolved.bootstrap && !resolved.rbac) {
    throw new Error('rbac: modules.bootstrap requires modules.rbac')
  }
  return resolved
}
