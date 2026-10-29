import { iamAuthApiUrl } from '#iam/shared/paths/auth-api-path'
import { IAM_AUTH_ROUTES } from '#iam/shared/paths/auth-routes'
import {
  parseLoginOtpEmailHintFromCookieHeader,
  requestHasPendingLoginOtpCookie,
} from './cookie-names'

export function loginOtpEmailVerificationId(twoFactorChallengeId: string): string {
  return `2fa-email-${twoFactorChallengeId}`
}

/** Resolve email for the login OTP step (SSR + optional internal auth handler). */
export async function resolvePendingLoginOtpEmailForLoginView(
  authHandler: (request: Request) => Response | Promise<Response>,
  origin: string,
  cookieHeader: string | null | undefined
): Promise<string | null> {
  const fromHint = parseLoginOtpEmailHintFromCookieHeader(cookieHeader)
  if (fromHint) return fromHint
  if (!requestHasPendingLoginOtpCookie(cookieHeader)) return null

  const base = origin.replace(/\/$/, '')
  const url = `${base}${iamAuthApiUrl(IAM_AUTH_ROUTES.emailAndPassword.loginOtp.pendingEmail)}`
  const res = await authHandler(
    new Request(url, {
      method: 'GET',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    })
  )
  if (!res.ok) return null
  const body = (await res.json()) as { email?: unknown }
  return typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null
}
