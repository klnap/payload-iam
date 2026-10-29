import { describe, expect, test } from 'bun:test'
import {
  buildIamAuthAllowlistRoutes,
  IAM_AUTH_ROUTES,
} from '../../../../src/shared/paths/auth-routes'

describe('IAM_AUTH_ROUTES', () => {
  test('login OTP paths live under email-and-password', () => {
    expect(IAM_AUTH_ROUTES.emailAndPassword.loginOtp.pendingEmail).toBe(
      '/email-and-password/login-otp/pending-email'
    )
  })

  test('google invite bind is namespaced', () => {
    expect(IAM_AUTH_ROUTES.google.inviteBind).toBe('/google/invite/bind')
  })
})

describe('buildIamAuthAllowlistRoutes', () => {
  test('includes IAM login OTP routes when loginOtp enabled', () => {
    const routes = buildIamAuthAllowlistRoutes({
      emailAndPassword: true,
      google: false,
      loginOtp: true,
      forgotPassword: true,
    })
    expect(routes.some((r) => r.path === IAM_AUTH_ROUTES.emailAndPassword.loginOtp.send)).toBe(true)
  })

  test('reset/set-password routes require forgotPassword', () => {
    const withoutForgot = buildIamAuthAllowlistRoutes({
      emailAndPassword: true,
      google: false,
      loginOtp: false,
      forgotPassword: false,
    })
    expect(
      withoutForgot.some((r) => r.path === IAM_AUTH_ROUTES.emailAndPassword.resetPassword)
    ).toBe(false)
    expect(withoutForgot.some((r) => r.path === IAM_AUTH_ROUTES.betterAuth.resetPassword)).toBe(
      false
    )
    expect(withoutForgot.some((r) => r.path === IAM_AUTH_ROUTES.emailAndPassword.setPassword)).toBe(
      false
    )

    const withForgot = buildIamAuthAllowlistRoutes({
      emailAndPassword: true,
      google: false,
      loginOtp: false,
      forgotPassword: true,
    })
    expect(withForgot.some((r) => r.path === IAM_AUTH_ROUTES.emailAndPassword.resetPassword)).toBe(
      true
    )
    expect(withForgot.some((r) => r.path === IAM_AUTH_ROUTES.emailAndPassword.setPassword)).toBe(
      true
    )
  })
})
