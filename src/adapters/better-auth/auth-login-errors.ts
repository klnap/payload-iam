import type { LoginAuthErrorCode } from '#iam/modules/auth/ui/hooks/login-auth-error-code'
import { adminAbsoluteUrl } from '#iam/shared/paths/admin-absolute-url'
import { normalizeAuthPathname } from './security/http-allowlist'

export type { LoginAuthErrorCode } from '#iam/modules/auth/ui/hooks/login-auth-error-code'

const OAUTH_ACCESS_DENIED_ERRORS = new Set([
  'signup_disabled',
  'unable_to_link_account',
  'unable_to_update_account',
  'email_not_found',
  'email_not_verified',
  'account_not_linked',
  'email_does_not_match',
  'account_already_linked_to_different_user',
  'unable_to_get_user_info',
  'access_denied',
])

export function adminLoginUrl(args: { baseURL: string; adminRoute: string }): string {
  return adminAbsoluteUrl(args.baseURL, args.adminRoute, '/login')
}

export function resolveLoginAuthError(args: {
  betterAuthError?: string | null
  /** `authError` query param on admin login (e.g. invite-only OAuth rejection). */
  queryAuthError?: string | null
}): LoginAuthErrorCode | null {
  const query = args.queryAuthError
  if (query === 'access_denied' || query === 'sign_in_denied') return 'access_denied'

  const code = args.betterAuthError?.toLowerCase()
  if (!code) return null
  if (OAUTH_ACCESS_DENIED_ERRORS.has(code)) return 'access_denied'
  return 'access_denied'
}

/** Redirect GET `{basePath}/error` to admin login with preserved query params. */
export function buildLoginRedirectForAuthError(args: {
  requestUrl: string
  basePath: string
  baseURL: string
  adminRoute: string
}): Response | null {
  const path = normalizeAuthPathname(args.requestUrl, args.basePath)
  if (path !== '/error') return null

  const incoming = new URL(args.requestUrl)
  const loginUrl = new URL(adminLoginUrl(args))

  const error = incoming.searchParams.get('error')
  if (error) loginUrl.searchParams.set('error', error)

  const redirect = incoming.searchParams.get('redirect') ?? incoming.searchParams.get('callbackURL')
  if (redirect) loginUrl.searchParams.set('redirect', redirect)

  return Response.redirect(loginUrl.toString(), 302)
}
