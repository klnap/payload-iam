import { describe, expect, test } from 'bun:test'
import {
  LOGIN_OTP_EMAIL_HINT_COOKIE,
  parseLoginOtpEmailHintFromCookieHeader,
  requestHasPendingLoginOtpCookie,
  unprefixedSessionCookies,
} from '../../../../src/adapters/better-auth/cookie-names'

describe('unprefixedSessionCookies', () => {
  test('uses plain cookie names without vendor prefix', () => {
    const cookies = unprefixedSessionCookies()
    expect(cookies?.session_token?.name).toBe('session_token')
    expect(cookies?.two_factor?.name).toBe('two_factor')
  })

  test('parses login OTP email hint cookie', () => {
    expect(parseLoginOtpEmailHintFromCookieHeader(null)).toBe(null)
    expect(
      parseLoginOtpEmailHintFromCookieHeader(
        `${LOGIN_OTP_EMAIL_HINT_COOKIE}=${encodeURIComponent('a@b.c')}; two_factor=x`
      )
    ).toBe('a@b.c')
  })

  test('detects pending login OTP cookie', () => {
    expect(requestHasPendingLoginOtpCookie(null)).toBe(false)
    expect(requestHasPendingLoginOtpCookie('session_token=abc')).toBe(false)
    expect(requestHasPendingLoginOtpCookie('two_factor=signed')).toBe(true)
    expect(requestHasPendingLoginOtpCookie('__Secure-two_factor=signed')).toBe(true)
  })

  test('host overrides win', () => {
    const cookies = unprefixedSessionCookies({
      session_token: { name: 'custom_session' },
    })
    expect(cookies?.session_token?.name).toBe('custom_session')
    expect(cookies?.trust_device?.name).toBe('trust_device')
  })
})
