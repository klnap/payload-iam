export {
  canUseAdminShell,
  isAdminPanelUser,
  isClientAdminPanelUser,
} from './access/admin-panel-user'
export { applyRbacFieldAccess } from './access/apply-field-access'
export type { RolePermissions } from './access/can'
export {
  canAccessAdmin,
  canAccessRegister,
  canAccessRegisterField,
  effectiveIsRoot,
  effectivePermissions,
  intersectAccess,
  pluginCollectionPermission,
  wrapFieldAccess,
  wrapModelAccess,
} from './access/can'
export {
  canCallerAccessTargetUser,
  loadUserForAccessCheck,
} from './access/can-read-target-user'
export {
  assertRoleEditable,
  assertRolePermissionsWithinCeiling,
  assertRolesAssignable,
  filterEntitySlugsByCeiling,
  filterRolesWithinCeiling,
  INVITE_ROLE_BEYOND_CEILING,
  INVITE_ROOT_ROLE,
  ROLE_CREATE_PERMS_BEYOND_CEILING,
  ROLE_OUTSIDE_CEILING,
  ROLE_PERMS_BEYOND_CEILING,
  type RoleLike,
  resolveCallerCeiling,
  roleIdsOutsideCallerCeiling,
  roleWithinCallerCeiling,
} from './domain/ceiling'
export { roleLabelsAfterRead } from './hooks/role-labels-after-read.hook'
