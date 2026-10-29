import type { AuthHttpMethod, AuthRouteRule } from '#iam/types/config'

/**
 * IAM auth HTTP paths (relative to `IAM_AUTH_API_BASE_PATH`).
 *
 * - `emailAndPassword` / `google` / `invitations` — public IAM surface (prefer these in app code).
 * - `betterAuth` — Better Auth plugin paths (allowlist + forwards only; do not import in UI).
 */
export const IAM_AUTH_ROUTES = {
  session: {
    signOut: '/sign-out',
    getSession: '/get-session',
    ok: '/ok',
    error: '/error',
  },
  invitations: {
    accept: '/invitations/accept',
  },
  emailAndPassword: {
    signIn: '/email-and-password/sign-in',
    resetPassword: '/email-and-password/reset-password',
    setPassword: '/email-and-password/set-password',
    loginOtp: {
      pendingEmail: '/email-and-password/login-otp/pending-email',
      send: '/email-and-password/login-otp/send',
      verify: '/email-and-password/login-otp/verify',
    },
  },
  google: {
    signIn: '/google/sign-in',
    callback: '/google/callback',
    inviteBind: '/google/invite/bind',
    link: '/google/link',
    unlink: '/google/unlink',
    listAccounts: '/google/accounts',
  },
  betterAuth: {
    signInEmail: '/sign-in/email',
    resetPassword: '/reset-password',
    setPassword: '/set-password',
    twoFactorSendOtp: '/two-factor/send-otp',
    twoFactorVerifyOtp: '/two-factor/verify-otp',
    signInSocial: '/sign-in/social',
    callbackGoogle: '/callback/google',
    linkSocial: '/link-social',
    unlinkAccount: '/unlink-account',
    listAccounts: '/list-accounts',
  },
} as const

const r = (method: AuthHttpMethod, path: string): AuthRouteRule => ({ method, path })

/** Routes exposed when all auth methods are enabled (superset for tests). */
export const IAM_AUTH_ROUTE_RULES_ALL: readonly AuthRouteRule[] = [
  r('GET', IAM_AUTH_ROUTES.session.getSession),
  r('POST', IAM_AUTH_ROUTES.session.getSession),
  r('POST', IAM_AUTH_ROUTES.session.signOut),
  r('GET', IAM_AUTH_ROUTES.session.ok),
  r('GET', IAM_AUTH_ROUTES.session.error),
  r('POST', IAM_AUTH_ROUTES.invitations.accept),
  r('POST', IAM_AUTH_ROUTES.emailAndPassword.signIn),
  r('POST', IAM_AUTH_ROUTES.emailAndPassword.resetPassword),
  r('POST', IAM_AUTH_ROUTES.emailAndPassword.setPassword),
  r('GET', IAM_AUTH_ROUTES.emailAndPassword.loginOtp.pendingEmail),
  r('POST', IAM_AUTH_ROUTES.emailAndPassword.loginOtp.send),
  r('POST', IAM_AUTH_ROUTES.emailAndPassword.loginOtp.verify),
  r('POST', IAM_AUTH_ROUTES.google.signIn),
  r('GET', IAM_AUTH_ROUTES.google.callback),
  r('POST', IAM_AUTH_ROUTES.google.inviteBind),
  r('POST', IAM_AUTH_ROUTES.google.link),
  r('POST', IAM_AUTH_ROUTES.google.unlink),
  r('GET', IAM_AUTH_ROUTES.google.listAccounts),
  r('POST', IAM_AUTH_ROUTES.betterAuth.signInEmail),
  r('POST', IAM_AUTH_ROUTES.betterAuth.resetPassword),
  r('POST', IAM_AUTH_ROUTES.betterAuth.setPassword),
  r('POST', IAM_AUTH_ROUTES.betterAuth.twoFactorSendOtp),
  r('POST', IAM_AUTH_ROUTES.betterAuth.twoFactorVerifyOtp),
  r('POST', IAM_AUTH_ROUTES.betterAuth.signInSocial),
  r('GET', IAM_AUTH_ROUTES.betterAuth.callbackGoogle),
  r('POST', IAM_AUTH_ROUTES.betterAuth.linkSocial),
  r('POST', IAM_AUTH_ROUTES.betterAuth.unlinkAccount),
  r('GET', IAM_AUTH_ROUTES.betterAuth.listAccounts),
]

export type AuthMethodAllowlistFlags = {
  emailAndPassword: boolean
  google: boolean
  loginOtp: boolean
  forgotPassword: boolean
}

export function buildIamAuthAllowlistRoutes(
  flags: AuthMethodAllowlistFlags
): readonly AuthRouteRule[] {
  const routes: AuthRouteRule[] = [
    r('GET', IAM_AUTH_ROUTES.session.getSession),
    r('POST', IAM_AUTH_ROUTES.session.getSession),
    r('POST', IAM_AUTH_ROUTES.session.signOut),
    r('GET', IAM_AUTH_ROUTES.session.ok),
    r('GET', IAM_AUTH_ROUTES.session.error),
    r('POST', IAM_AUTH_ROUTES.invitations.accept),
  ]

  if (flags.emailAndPassword) {
    routes.push(
      r('POST', IAM_AUTH_ROUTES.emailAndPassword.signIn),
      r('POST', IAM_AUTH_ROUTES.betterAuth.signInEmail)
    )
  }

  if (flags.forgotPassword) {
    routes.push(
      r('POST', IAM_AUTH_ROUTES.emailAndPassword.resetPassword),
      r('POST', IAM_AUTH_ROUTES.betterAuth.resetPassword),
      r('POST', IAM_AUTH_ROUTES.emailAndPassword.setPassword),
      r('POST', IAM_AUTH_ROUTES.betterAuth.setPassword)
    )
  }

  if (flags.loginOtp) {
    routes.push(
      r('GET', IAM_AUTH_ROUTES.emailAndPassword.loginOtp.pendingEmail),
      r('POST', IAM_AUTH_ROUTES.emailAndPassword.loginOtp.send),
      r('POST', IAM_AUTH_ROUTES.emailAndPassword.loginOtp.verify),
      r('POST', IAM_AUTH_ROUTES.betterAuth.twoFactorSendOtp),
      r('POST', IAM_AUTH_ROUTES.betterAuth.twoFactorVerifyOtp)
    )
  }

  if (flags.google) {
    routes.push(
      r('POST', IAM_AUTH_ROUTES.google.signIn),
      r('GET', IAM_AUTH_ROUTES.google.callback),
      r('POST', IAM_AUTH_ROUTES.google.inviteBind),
      r('POST', IAM_AUTH_ROUTES.google.link),
      r('POST', IAM_AUTH_ROUTES.google.unlink),
      r('GET', IAM_AUTH_ROUTES.google.listAccounts),
      r('POST', IAM_AUTH_ROUTES.betterAuth.signInSocial),
      r('GET', IAM_AUTH_ROUTES.betterAuth.callbackGoogle),
      r('POST', IAM_AUTH_ROUTES.betterAuth.linkSocial),
      r('POST', IAM_AUTH_ROUTES.betterAuth.unlinkAccount),
      r('GET', IAM_AUTH_ROUTES.betterAuth.listAccounts)
    )
  }

  return routes
}
