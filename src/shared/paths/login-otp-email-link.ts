import { adminAbsolutePath } from './admin-absolute-url'

/** Admin login URL with OTP query param (short-lived code; same browser session still required for verify). */
export function buildLoginOtpSignInUrl(args: {
  serverURL: string
  adminRoute: string
  otp: string
}): string {
  const base = args.serverURL.replace(/\/$/, '')
  const loginPath = adminAbsolutePath(args.adminRoute, '/login')
  const url = new URL(loginPath, `${base}/`)
  url.searchParams.set('otp', args.otp)
  return url.toString()
}
