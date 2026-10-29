import { resolveLoginOtpRecipient } from '#iam/adapters/email/resolve-login-otp-recipient'
import type { HostRuntimeDeps } from '#iam/types/config'
import { TWO_FACTOR_COOKIE_NAME } from './cookie-names'
import { loginOtpEmailVerificationId } from './resolve-pending-login-otp-email'

const DEFAULT_TWO_FACTOR_COOKIE_MAX_AGE = 600

type PendingEmailCtx = {
  getSignedCookie: (name: string, secret: string) => Promise<string | false | null | undefined>
  context: {
    secret: string
    createAuthCookie: (
      name: string,
      options?: { maxAge?: number }
    ) => { name: string; attributes: Record<string, unknown> }
    internalAdapter: {
      findVerificationValue: (
        identifier: string
      ) => Promise<{ value: string; expiresAt?: Date } | null>
    }
  }
  json: (body: Record<string, unknown>) => Response | Promise<Response>
}

/** GET `IAM_AUTH_ROUTES.emailAndPassword.loginOtp.pendingEmail` — email for active `two_factor` challenge. */
export async function handlePendingLoginOtpEmail(
  host: HostRuntimeDeps,
  ctx: PendingEmailCtx
): Promise<Response> {
  if (!host.loginOtp.enabled) return ctx.json({ email: null })

  const twoFactorCookie = ctx.context.createAuthCookie(TWO_FACTOR_COOKIE_NAME, {
    maxAge: DEFAULT_TWO_FACTOR_COOKIE_MAX_AGE,
  })
  const challengeId = await ctx.getSignedCookie(twoFactorCookie.name, ctx.context.secret)
  if (!challengeId) return ctx.json({ email: null })

  const emailRecord = await ctx.context.internalAdapter.findVerificationValue(
    loginOtpEmailVerificationId(challengeId)
  )
  if (emailRecord?.value?.trim()) {
    return ctx.json({ email: emailRecord.value.trim() })
  }

  const userChallenge = await ctx.context.internalAdapter.findVerificationValue(challengeId)
  if (!userChallenge?.value) return ctx.json({ email: null })

  const resolved = await resolveLoginOtpRecipient(host, userChallenge.value, null)
  return ctx.json({ email: resolved ?? null })
}
