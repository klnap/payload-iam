export { iamConsoleEmailAdapter } from '../adapters/payload/console-email-adapter'
export type { PayloadMatrixField } from '../core/permissions/shape'
export { isPermissionsSubset } from '../core/permissions/subset'
export {
  COLLECTION_MATRIX_FIELD_OPS,
  COLLECTION_MATRIX_OPS,
  collectionEntityMatrixOps,
  collectionMatrixFrameOps,
  collectionMatrixModel,
} from '../core/rbac/collection-matrix-model'
export { hasDraftsEnabled } from '../core/rbac/drafts-enabled'
export {
  GLOBAL_MATRIX_FIELD_OPS,
  globalEntityMatrixOps,
  globalHasDraftsEnabled,
  globalMatrixFrameOps,
  globalMatrixOpAllowed,
} from '../core/rbac/global-matrix-model'
export { defineRbacModel, fieldMatrixOps } from '../core/rbac/register-model'
export { hashServiceToken } from '../modules/auth/services/pre-payload-service-auth'
export type { RbacAccessUser, RolePermissions } from '../modules/rbac/access/can'
export {
  canAccessAdmin,
  canAccessRegister,
  canAccessRegisterField,
  effectiveIsRoot,
  effectivePermissions,
  intersectAccess,
  wrapFieldAccess,
  wrapModelAccess,
} from '../modules/rbac/access/can'
export {
  assertRolePermissionsWithinCeiling,
  assertRolesAssignable,
  filterEntitySlugsByCeiling,
  filterRolesWithinCeiling,
  INVITE_ROLE_BEYOND_CEILING,
  INVITE_ROOT_ROLE,
  ROLE_CREATE_PERMS_BEYOND_CEILING,
  ROLE_PERMS_BEYOND_CEILING,
  resolveCallerCeiling,
  roleWithinCallerCeiling,
} from '../modules/rbac/domain/ceiling'
export {
  createPayloadIamRuntime,
  getRegisteredIam,
  IAM,
  iam,
} from '../plugin/runtime/create-runtime'
export type { PayloadWithIam } from '../plugin/runtime/get-payload-iam'
export { getPayloadIam } from '../plugin/runtime/get-payload-iam'
export { iamPluginTranslations } from '../shared/i18n/translations'
export { IAM_AUTH_API_BASE_PATH, iamAuthApiUrl } from '../shared/paths/auth-api-path'
export { buildIamAuthAllowlistRoutes, IAM_AUTH_ROUTES } from '../shared/paths/auth-routes'
export {
  IAM_SESSION_ENDED_PATH,
  IAM_SIGN_OUT_PATH,
} from '../shared/paths/auth-view-paths'
export {
  ACCESS_ADMIN_NAV_LINK,
  insertAfterNavLinkBeforeAccess,
  pinAccessNavLinkLast,
  withAccessAdminNavLink,
} from '../shared/ui/admin/after-nav-links'
export type {
  Actor,
  AdvisoryLock,
  IamApi,
  IamOptions,
  IamSurface,
  PayloadIamRuntime,
  RbacAuthMethods,
  RbacEmailPasswordMethod,
  RbacGoogleMethod,
  RbacLoginOtpOptions,
  RbacModelFieldDef,
  RbacPermissionModel,
  RbacRegisterExtension,
  RbacRegisterItem,
  RbacRegisterTab,
  RbacSessionOptions,
  ServiceTokenRecord,
} from '../types/config'
export type { ServicePrincipal } from '../types/service-principal'

/** Seed/bootstrap only — wraps work in BOOTSTRAP InternalOperation. */
export async function withBootstrap<T>(fn: () => Promise<T>): Promise<T> {
  const { runWithInternalOperation } = await import('../adapters/payload/operation-als')
  return runWithInternalOperation({ kind: 'BOOTSTRAP' }, fn)
}

export {
  HTTP_BOOTSTRAP_DISABLED_MESSAGE,
  isHttpBootstrapAllowed,
  isRootBootstrapAllowed,
  MISSING_ROOT_PROD_MESSAGE,
} from '../modules/bootstrap/config/bootstrap'
export { isRootRole, ROOT_ROLE_NAME } from '../modules/bootstrap/config/root'
export {
  assertRootOrAllowBootstrap,
  type BootstrapRootInput,
  bootstrapRoot,
} from '../modules/bootstrap/services/bootstrap-root'
export {
  type EnsureRootResult,
  ensureRootRole,
} from '../modules/bootstrap/services/ensure-root-role'
export { hasRoot } from '../modules/bootstrap/services/has-root'
export { runExpireStaleInvitations } from '../modules/invitations/services/expiry/run-expire-stale-invitations'
