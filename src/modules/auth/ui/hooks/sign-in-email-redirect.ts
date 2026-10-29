'use client'

import { toast } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import { getIamAuthClient } from '#iam/modules/auth/ui/client/auth-client'

/**
 * Email sign-in then hard navigation to admin (same as LoginForm).
 * Returns false when sign-in failed or OTP is required.
 */
export async function signInWithEmailAndRedirect(args: {
  email: string
  password: string
  adminRoute: string
  redirectTo: string
  loginOtp?: boolean
  unauthorizedMessage?: string
}): Promise<boolean> {
  const {
    email,
    password,
    adminRoute,
    redirectTo,
    loginOtp = false,
    unauthorizedMessage = 'Could not sign in',
  } = args

  try {
    const { data, error } = await getIamAuthClient().signIn.email({
      email,
      password,
      ...(loginOtp ? {} : { callbackURL: redirectTo }),
    })
    if (error) {
      toast.error(unauthorizedMessage)
      return false
    }
    if (
      data &&
      typeof data === 'object' &&
      'twoFactorRedirect' in data &&
      (data as { twoFactorRedirect?: boolean }).twoFactorRedirect
    ) {
      const loginPath = formatAdminURL({
        adminRoute: adminRoute as `/${string}`,
        path: '/login' as `/${string}`,
      })
      toast.error('Complete two-factor sign-in on the login page')
      window.location.assign(`${loginPath}?redirect=${encodeURIComponent(redirectTo)}`)
      return false
    }
    window.location.assign(redirectTo)
    return true
  } catch {
    toast.error(unauthorizedMessage)
    return false
  }
}
