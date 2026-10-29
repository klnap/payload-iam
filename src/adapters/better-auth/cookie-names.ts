import type { BetterAuthOptions } from 'better-auth'

type BetterAuthCookieMap = NonNullable<NonNullable<BetterAuthOptions['advanced']>['cookies']>

/** Session mount cookie keys — unprefixed names (no vendor prefix in the browser). */
/** Pending login OTP challenge (Better Auth two-factor plugin). */
export const TWO_FACTOR_COOKIE_NAME = 'two_factor'

/** Display-only hint for login OTP step (not httpOnly; paired with `two_factor`). */
export const LOGIN_OTP_EMAIL_HINT_COOKIE = 'iam_login_otp_email'

const UNPREFIXED_COOKIE_KEYS = [
  'session_token',
  'session_data',
  'dont_remember',
  'account_data',
  TWO_FACTOR_COOKIE_NAME,
  'trust_device',
  'oauth_state',
] as const

export function parseLoginOtpEmailHintFromCookieHeader(
  cookieHeader: string | null | undefined
): string | null {
  if (!cookieHeader) return null
  const prefix = `${LOGIN_OTP_EMAIL_HINT_COOKIE}=`
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(prefix)) continue
    const raw = trimmed.slice(prefix.length)
    try {
      const value = decodeURIComponent(raw).trim()
      return value || null
    } catch {
      return null
    }
  }
  return null
}

/** True when `two_factor` is present — password OK but session not established yet. */
export function requestHasPendingLoginOtpCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false
  const plain = `${TWO_FACTOR_COOKIE_NAME}=`
  const secure = `__Secure-${TWO_FACTOR_COOKIE_NAME}=`
  return cookieHeader.includes(plain) || cookieHeader.includes(secure)
}

/** `advanced.cookies` entries — host may override per-key via `betterAuthOptions.advanced.cookies` (internal option bag). */
export function unprefixedSessionCookies(hostCookies?: BetterAuthCookieMap): BetterAuthCookieMap {
  const defaults = Object.fromEntries(
    UNPREFIXED_COOKIE_KEYS.map((key) => [key, { name: key }])
  ) as BetterAuthCookieMap

  return { ...defaults, ...hostCookies }
}
