import type { RbacAuthMethods, RbacEmailPasswordMethod, RbacGoogleMethod } from '#iam/types/config'

export type ResolvedEmailPasswordMethod = RbacEmailPasswordMethod & {
  enabled: boolean
}

export type ResolvedGoogleMethod = RbacGoogleMethod & { enabled: true }

export const DEFAULT_EMAIL_AND_PASSWORD: ResolvedEmailPasswordMethod = {
  enabled: true,
}

export function resolveEmailAndPasswordMethod(
  methods?: RbacAuthMethods
): ResolvedEmailPasswordMethod {
  const raw = methods?.emailAndPassword
  if (!raw) return DEFAULT_EMAIL_AND_PASSWORD
  return {
    ...raw,
    enabled: raw.enabled ?? true,
  }
}

export function isEmailAndPasswordEnabled(methods?: RbacAuthMethods): boolean {
  return resolveEmailAndPasswordMethod(methods).enabled
}

/** Forgot-password flow (public form + admin send-reset). Requires email/password. */
export function isForgotPasswordEnabled(methods?: RbacAuthMethods): boolean {
  if (!isEmailAndPasswordEnabled(methods)) return false
  const raw = methods?.emailAndPassword?.forgotPassword
  if (!raw) return true
  return raw.enabled !== false
}

/** Active Google OAuth config, or `undefined` when disabled / omitted. */
export function resolveGoogleMethod(methods?: RbacAuthMethods): ResolvedGoogleMethod | undefined {
  const google = methods?.google
  if (!google || google.enabled === false) return undefined
  return { ...google, enabled: true }
}
