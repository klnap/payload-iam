import { describe, expect, test } from 'bun:test'
import {
  isEmailAndPasswordEnabled,
  isForgotPasswordEnabled,
} from '../../../../src/modules/auth/config/auth-methods'

describe('auth methods', () => {
  test('forgot password defaults on with email/password', () => {
    expect(isForgotPasswordEnabled({ emailAndPassword: { enabled: true } })).toBe(true)
    expect(isForgotPasswordEnabled({})).toBe(true)
  })

  test('forgot password off when email/password off', () => {
    expect(isForgotPasswordEnabled({ emailAndPassword: { enabled: false } })).toBe(false)
    expect(isEmailAndPasswordEnabled({ emailAndPassword: { enabled: false } })).toBe(false)
  })

  test('forgot password explicit toggle', () => {
    expect(
      isForgotPasswordEnabled({
        emailAndPassword: { enabled: true, forgotPassword: { enabled: false } },
      })
    ).toBe(false)
  })
})
