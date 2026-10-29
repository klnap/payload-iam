import {
  isEmailAndPasswordEnabled,
  isForgotPasswordEnabled,
  resolveEmailAndPasswordMethod,
  resolveGoogleMethod,
} from '#iam/modules/auth/config/auth-methods'
import { resolveLoginOtpFromOptions } from '#iam/modules/auth/methods/email-and-password/config/login-otp.config'
import type { BetterAuthHostOptions, IamOptions } from '#iam/types/config'

export type ResolvedAuthMethods = {
  emailAndPassword: boolean
  google: boolean
  loginOtp: boolean
  forgotPassword: boolean
}

export function resolveAuthMethods(options: Pick<IamOptions, 'methods'>): ResolvedAuthMethods {
  const emailOn = isEmailAndPasswordEnabled(options.methods)
  const googleOn = Boolean(resolveGoogleMethod(options.methods))
  const loginOtp = resolveLoginOtpFromOptions(options)
  return {
    emailAndPassword: emailOn,
    google: googleOn,
    loginOtp: emailOn && loginOtp.enabled,
    forgotPassword: isForgotPasswordEnabled(options.methods),
  }
}

/** Map public plugin config → internal auth engine options. */
export function toBetterAuthHostOptions(options: IamOptions): BetterAuthHostOptions {
  const email = resolveEmailAndPasswordMethod(options.methods)
  const google = resolveGoogleMethod(options.methods)

  return {
    secret: options.secret,
    emailAndPassword: { enabled: email.enabled },
    ...(google
      ? {
          socialProviders: {
            google: {
              clientId: google.clientId,
              clientSecret: google.clientSecret,
            },
          },
        }
      : {}),
    ...(options.session ? { session: options.session } : {}),
  }
}

export {
  DEFAULT_EMAIL_AND_PASSWORD,
  isEmailAndPasswordEnabled,
  isForgotPasswordEnabled,
  resolveEmailAndPasswordMethod,
  resolveGoogleMethod,
} from '#iam/modules/auth/config/auth-methods'
