import { resolveEmailAndPasswordMethod } from '#iam/modules/auth/config/auth-methods'
import type { IamOptions } from '#iam/types/config'

export const LOGIN_OTP_MIN_LENGTH = 6
export const LOGIN_OTP_MAX_LENGTH = 10

/** Defaults for login email OTP (Better Auth two-factor OTP). Opt-in via `otp.enabled: true`. */
export const LOGIN_OTP_DEFAULTS = {
  enabled: false,
  length: 6,
} as const

export function clampLoginOtpLength(length: number): number {
  if (!Number.isInteger(length)) return LOGIN_OTP_DEFAULTS.length
  return Math.min(LOGIN_OTP_MAX_LENGTH, Math.max(LOGIN_OTP_MIN_LENGTH, length))
}

export type ResolvedLoginOtp = {
  enabled: boolean
  length: number
}

export function resolveLoginOtp(input?: { enabled?: boolean; length?: number }): ResolvedLoginOtp {
  const length = input?.length ?? LOGIN_OTP_DEFAULTS.length
  if (!Number.isInteger(length) || length < LOGIN_OTP_MIN_LENGTH || length > LOGIN_OTP_MAX_LENGTH) {
    throw new Error(
      `rbac: methods.emailAndPassword.otp.length must be an integer ${LOGIN_OTP_MIN_LENGTH}–${LOGIN_OTP_MAX_LENGTH}`
    )
  }
  return {
    enabled: input?.enabled ?? LOGIN_OTP_DEFAULTS.enabled,
    length,
  }
}

/** Resolves login OTP from `methods.emailAndPassword.otp`. */
export function resolveLoginOtpFromOptions(options: Pick<IamOptions, 'methods'>): ResolvedLoginOtp {
  const email = resolveEmailAndPasswordMethod(options.methods)
  if (!email.enabled) {
    return {
      enabled: false,
      length: LOGIN_OTP_DEFAULTS.length,
    }
  }
  return resolveLoginOtp(email.otp)
}
