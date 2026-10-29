export function definedDataKeys(data: Record<string, unknown>): string[] {
  return Object.keys(data).filter((k) => data[k] !== undefined)
}

export function isOAuthCallbackEndpoint(endpointCtx?: unknown): boolean {
  const ctx = endpointCtx as { path?: string; context?: { path?: string } } | undefined
  const path = ctx?.path ?? ctx?.context?.path ?? ''
  return typeof path === 'string' && path.includes('callback')
}

const BLOCKED_ACCOUNT_UPDATE_KEYS = new Set([
  'accountId',
  'userId',
  'password',
  'payloadRbacProvisioningId',
])

/** Only BA-managed OAuth account columns — never name, email, or other profile fields. */
const OAUTH_ACCOUNT_TOKEN_FIELDS = new Set([
  'accessToken',
  'refreshToken',
  'idToken',
  'accessTokenExpiresAt',
  'refreshTokenExpiresAt',
  'scope',
  'updatedAt',
  'createdAt',
  'providerId',
])

const OAUTH_ACCOUNT_TOKEN_SIGNAL_KEYS = new Set([
  'accessToken',
  'refreshToken',
  'idToken',
  'accessTokenExpiresAt',
  'refreshTokenExpiresAt',
  'scope',
])

/**
 * Account row patch is OAuth token maintenance only (sign-in / link refresh).
 * Rejects arbitrary fields (e.g. would-be profile data on `account`).
 */
export function isOAuthAccountTokenOnlyUpdate(data: Record<string, unknown>): boolean {
  const keys = definedDataKeys(data)
  if (keys.length === 0) return false
  if (keys.some((k) => BLOCKED_ACCOUNT_UPDATE_KEYS.has(k))) return false
  if (!keys.every((k) => OAUTH_ACCOUNT_TOKEN_FIELDS.has(k))) return false
  return keys.some((k) => OAUTH_ACCOUNT_TOKEN_SIGNAL_KEYS.has(k))
}

export function allowAccountUpdateDuringOAuth(
  data: Record<string, unknown>,
  endpointCtx?: unknown
): boolean {
  if (!isOAuthCallbackEndpoint(endpointCtx)) return false
  return isOAuthAccountTokenOnlyUpdate(data)
}

export function allowUserEmailVerifiedDuringOAuth(
  data: Record<string, unknown>,
  endpointCtx?: unknown
): boolean {
  if (!isOAuthCallbackEndpoint(endpointCtx)) return false
  const keys = definedDataKeys(data)
  return keys.length > 0 && keys.every((k) => k === 'emailVerified' || k === 'updatedAt')
}

/** Fallback when DB hook context omits callback path (still no InternalOperation ALS). */
export function looksLikeOAuthAccountPatch(data: Record<string, unknown>): boolean {
  return isOAuthAccountTokenOnlyUpdate(data)
}
