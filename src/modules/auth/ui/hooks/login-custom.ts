import type { Payload } from 'payload'
import {
  clampLoginOtpLength,
  LOGIN_OTP_DEFAULTS,
} from '#iam/modules/auth/methods/email-and-password/config/login-otp.config'
import {
  type PayloadIamLoginCustom as LoginCustomConfig,
  readPayloadIamCustom,
} from '#iam/shared/config/payload-iam-custom'

export type { LoginCustomConfig }

export type ResolvedLoginCustom = {
  emailAndPassword: boolean
  google: boolean
  loginOtp: boolean
  forgotPassword: boolean
  length: number
  forgotRoute?: string
}

/** Login feature flags from `config.custom.payloadIam.login` + admin forgot route. */
export function resolveLoginCustom(payload: Payload): ResolvedLoginCustom {
  const custom = readPayloadIamCustom(
    payload.config.custom as Record<string, unknown> | undefined
  )?.login

  const emailAndPassword = custom?.emailAndPassword !== false
  const google = Boolean(custom?.google)
  /** Set by IAM plugin from `methods.emailAndPassword.otp.enabled` — not a separate UI flag. */
  const loginOtp = custom?.loginOtp === true
  const length =
    typeof custom?.length === 'number' && Number.isInteger(custom.length)
      ? clampLoginOtpLength(custom.length)
      : LOGIN_OTP_DEFAULTS.length
  const forgotPassword = custom?.forgotPassword !== false && emailAndPassword

  const adminRoutes = payload.config.admin?.routes
  const forgotRoute =
    forgotPassword && adminRoutes && typeof adminRoutes === 'object' && 'forgot' in adminRoutes
      ? (adminRoutes as { forgot?: string }).forgot
      : undefined

  return {
    emailAndPassword,
    google,
    loginOtp,
    length,
    forgotPassword,
    forgotRoute,
  }
}
