import { describe, expect, test } from 'bun:test'
import {
  allowlistGate,
  isAuthRouteAllowed,
  normalizeAuthPathname,
} from '../../../../../src/adapters/better-auth/security/http-allowlist'
import { IAM_AUTH_API_BASE_PATH } from '../../../../../src/shared/paths/auth-api-path'
import { IAM_AUTH_ROUTES } from '../../../../../src/shared/paths/auth-routes'

describe('http allowlist', () => {
  test('allows POST /sign-in/email', () => {
    expect(isAuthRouteAllowed('POST', '/sign-in/email')).toBe(true)
  })

  test('allows GET login OTP pending email when login OTP enabled', () => {
    expect(
      isAuthRouteAllowed('GET', IAM_AUTH_ROUTES.emailAndPassword.loginOtp.pendingEmail, {
        emailAndPassword: true,
        google: false,
        loginOtp: true,
        forgotPassword: true,
      })
    ).toBe(true)
  })

  test('denies GET /sign-in/email', () => {
    expect(isAuthRouteAllowed('GET', '/sign-in/email')).toBe(false)
  })

  test('normalize strips basePath', () => {
    expect(
      normalizeAuthPathname(
        `http://x${IAM_AUTH_API_BASE_PATH}/sign-in/email`,
        IAM_AUTH_API_BASE_PATH
      )
    ).toBe('/sign-in/email')
  })

  test('gate 404s unknown', () => {
    const res = allowlistGate(
      new Request(`http://x${IAM_AUTH_API_BASE_PATH}/evil`, { method: 'POST' })
    )
    expect(res?.status).toBe(404)
  })

  test('gate null on allow', () => {
    const res = allowlistGate(
      new Request(`http://x${IAM_AUTH_API_BASE_PATH}/sign-in/email`, { method: 'POST' })
    )
    expect(res).toBeNull()
  })

  test('denies google routes when google disabled', () => {
    expect(
      isAuthRouteAllowed('GET', IAM_AUTH_ROUTES.google.callback, {
        emailAndPassword: true,
        google: false,
        loginOtp: true,
        forgotPassword: true,
      })
    ).toBe(false)
  })

  test('denies BA request-password-reset even when forgotPassword enabled', () => {
    expect(
      isAuthRouteAllowed('POST', '/request-password-reset', {
        emailAndPassword: true,
        google: true,
        loginOtp: false,
        forgotPassword: true,
      })
    ).toBe(false)
  })

  test('denies forgot-password routes when forgotPassword disabled', () => {
    expect(
      isAuthRouteAllowed('POST', '/request-password-reset', {
        emailAndPassword: true,
        google: false,
        loginOtp: false,
        forgotPassword: false,
      })
    ).toBe(false)
    expect(
      isAuthRouteAllowed('POST', IAM_AUTH_ROUTES.emailAndPassword.setPassword, {
        emailAndPassword: true,
        google: false,
        loginOtp: false,
        forgotPassword: false,
      })
    ).toBe(false)
    expect(
      isAuthRouteAllowed('POST', '/sign-in/email', {
        emailAndPassword: true,
        google: false,
        loginOtp: false,
        forgotPassword: false,
      })
    ).toBe(true)
    expect(
      isAuthRouteAllowed('POST', '/reset-password', {
        emailAndPassword: true,
        google: false,
        loginOtp: false,
        forgotPassword: false,
      })
    ).toBe(false)
    expect(
      isAuthRouteAllowed('POST', IAM_AUTH_ROUTES.emailAndPassword.resetPassword, {
        emailAndPassword: true,
        google: false,
        loginOtp: false,
        forgotPassword: false,
      })
    ).toBe(false)
  })
})

test('allows set-password when forgotPassword enabled', () => {
  expect(
    isAuthRouteAllowed('POST', IAM_AUTH_ROUTES.emailAndPassword.setPassword, {
      emailAndPassword: false,
      google: true,
      loginOtp: false,
      forgotPassword: true,
    })
  ).toBe(true)
})
