import { describe, expect, test } from 'bun:test'
import {
  clampLoginOtpLength,
  LOGIN_OTP_DEFAULTS,
  resolveLoginOtp,
  resolveLoginOtpFromOptions,
} from '../../../../../../../src/modules/auth/methods/email-and-password/config/login-otp.config'

describe('resolveLoginOtpFromOptions', () => {
  test('defaults when emailAndPassword omitted', () => {
    expect(resolveLoginOtpFromOptions({})).toEqual(LOGIN_OTP_DEFAULTS)
  })

  test('disabled when emailAndPassword.enabled is false', () => {
    expect(
      resolveLoginOtpFromOptions({
        methods: { emailAndPassword: { enabled: false } },
      }).enabled
    ).toBe(false)
  })

  test('reads nested otp', () => {
    expect(
      resolveLoginOtpFromOptions({
        methods: {
          emailAndPassword: {
            enabled: true,
            otp: { enabled: false, length: 8 },
          },
        },
      })
    ).toEqual({ enabled: false, length: 8 })
  })
})

describe('resolveLoginOtp', () => {
  test('defaults to disabled with 6-digit OTP length', () => {
    expect(resolveLoginOtp()).toEqual(LOGIN_OTP_DEFAULTS)
  })

  test('length alone does not enable OTP', () => {
    expect(resolveLoginOtp({ length: 6 }).enabled).toBe(false)
  })

  test('respects explicit disable', () => {
    expect(resolveLoginOtp({ enabled: false }).enabled).toBe(false)
  })

  test('rejects invalid otp length', () => {
    expect(() => resolveLoginOtp({ length: 5 })).toThrow(/otp\.length/)
  })
})

describe('clampLoginOtpLength', () => {
  test('clamps below minimum to 6', () => {
    expect(clampLoginOtpLength(1)).toBe(6)
  })

  test('clamps above maximum to 10', () => {
    expect(clampLoginOtpLength(12)).toBe(10)
  })
})
