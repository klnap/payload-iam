/** Auth collections — Role matrix Auth tab (not Collections). */
export const AUTH_MATRIX_SLUGS = new Set(['users', 'roles', 'invitations'])

/**
 * Hidden in document UI (`admin.hidden`) but still field-level RBAC rows
 * (e.g. `fullName` edited via custom `UserIdentityField`).
 */
export const MATRIX_INCLUDE_HIDDEN_FIELD_NAMES = new Set(['fullName'])

/** Fields never offered in the permissions matrix (structural / system / UI chrome). */
export const MATRIX_SKIP_FIELD_NAMES = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  '_status',
  'collection',
  'email',
  'roles',
  'isActive',
  'identity',
  'authAccountInsights',
  'authAccountInsightsUi',
  'adminUserSessions',
  'avatar',
  'roleLabels',
  'provisioningStatus',
  'provisioningOperationId',
  'provisioningRequestHash',
  'salt',
  'hash',
  'loginAttempts',
  'lockUntil',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'password',
  'users',
  'permissionsGlobalsUi',
  'permissionsAuthUi',
  'userId',
  'authorizedRoleIds',
  'version',
  'activeUserId',
  'terminalReason',
  'inviteLink',
  'roleOptions',
  'rolesDisplay',
  'renewInvite',
  'expiresAt',
])
