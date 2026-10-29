import { isOAuthRedirectStateVerification } from '#iam/adapters/better-auth/methods/google/oauth-redirect-state-verification'

/** Verification rows owned by Better Auth (2FA challenge, trust device, OAuth state). */
export function isBetterAuthManagedVerification(data: Record<string, unknown>): boolean {
  if (isOAuthRedirectStateVerification(data)) return true
  const identifier = String(data.identifier ?? '')
  if (identifier.startsWith('2fa-') || identifier.startsWith('trust-device-')) {
    return true
  }
  return false
}
