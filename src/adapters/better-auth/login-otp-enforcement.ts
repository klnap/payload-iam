import { createHMAC } from '@better-auth/utils/hmac'
import type { BetterAuthPlugin } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { deleteSessionCookie, expireCookie } from 'better-auth/cookies'
import { generateRandomString } from 'better-auth/crypto'
import { normalizeEmail } from '#iam/adapters/email/email'
import { resolveLoginOtpRecipient } from '#iam/adapters/email/resolve-login-otp-recipient'
import type { HostRuntimeDeps } from '#iam/types/config'
import { LOGIN_OTP_EMAIL_HINT_COOKIE, TWO_FACTOR_COOKIE_NAME } from './cookie-names'
import { hashLoginOtpForStorage } from './login-otp-hash'
import { loginOtpEmailVerificationId } from './resolve-pending-login-otp-email'

/** Email typed on credential sign-in (BA `user.email` is often empty). */
export function signInEmailFromLoginBody(body: unknown): string {
  if (!body || typeof body !== 'object') return ''
  const email = (body as { email?: unknown }).email
  if (typeof email !== 'string' || !email.trim()) return ''
  return normalizeEmail(email)
}

const TRUST_DEVICE_COOKIE_NAME = 'trust_device'

const EMAIL_SIGN_IN_PATHS = new Set([
  '/sign-in/email',
  '/sign-in/username',
  '/sign-in/phone-number',
])

const DEFAULT_TRUST_DEVICE_MAX_AGE = 60 * 60 * 24 * 30
const DEFAULT_TWO_FACTOR_COOKIE_MAX_AGE = 600
const LOGIN_OTP_EMAIL_EXPIRES_MINUTES = 3

/** Credential sign-in paths that should receive login OTP when host.loginOtp.enabled. */
export function emailSignInRequiresLoginOtp(path: string): boolean {
  const normalized = path.replace(/\/+$/, '') || '/'
  return EMAIL_SIGN_IN_PATHS.has(normalized)
}

/** After-hook middleware uses its own `responseHeaders`; BA / nextCookies read `context.responseHeaders`. */
function mirrorSetCookieHeadersToAuthContext(ctx: {
  responseHeaders: Headers
  context: { responseHeaders?: Headers }
}): void {
  const sink = ctx.context.responseHeaders
  if (!(sink instanceof Headers)) return
  for (const cookie of ctx.responseHeaders.getSetCookie()) {
    sink.append('set-cookie', cookie)
  }
}

/**
 * Login OTP is an admin policy from `host.loginOtp` (IAM config), not per-user DB fields.
 * Better Auth's bundled 2FA sign-in hook is skipped; these after-hooks own the challenge.
 */
export function createLoginOtpEnforcement(host: HostRuntimeDeps): BetterAuthPlugin {
  const trustDeviceMaxAge = DEFAULT_TRUST_DEVICE_MAX_AGE
  const twoFactorCookieMaxAge = DEFAULT_TWO_FACTOR_COOKIE_MAX_AGE

  return {
    id: 'payload-iam-login-otp-enforcement',
    hooks: {
      after: [
        {
          matcher(context) {
            if (!host.loginOtp.enabled) return false
            return emailSignInRequiresLoginOtp(context.path ?? '')
          },
          handler: createAuthMiddleware(async (ctx) => {
            const data = ctx.context.newSession
            if (!data) return

            const trustDeviceCookieAttrs = ctx.context.createAuthCookie(TRUST_DEVICE_COOKIE_NAME, {
              maxAge: trustDeviceMaxAge,
            })
            const trustDeviceCookie = await ctx.getSignedCookie(
              trustDeviceCookieAttrs.name,
              ctx.context.secret
            )
            if (trustDeviceCookie) {
              const [token, trustIdentifier] = trustDeviceCookie.split('!')
              if (token && trustIdentifier) {
                const expected = await createHMAC('SHA-256', 'base64urlnopad').sign(
                  ctx.context.secret,
                  `${data.user.id}!${trustIdentifier}`
                )
                if (token === expected) {
                  const verificationRecord =
                    await ctx.context.internalAdapter.findVerificationValue(trustIdentifier)
                  if (
                    verificationRecord &&
                    verificationRecord.value === data.user.id &&
                    verificationRecord.expiresAt > new Date()
                  ) {
                    await ctx.context.internalAdapter.deleteVerificationByIdentifier(
                      trustIdentifier
                    )
                    const newTrustIdentifier = `trust-device-${generateRandomString(32)}`
                    const newToken = await createHMAC('SHA-256', 'base64urlnopad').sign(
                      ctx.context.secret,
                      `${data.user.id}!${newTrustIdentifier}`
                    )
                    await ctx.context.internalAdapter.createVerificationValue({
                      value: data.user.id,
                      identifier: newTrustIdentifier,
                      expiresAt: new Date(Date.now() + trustDeviceMaxAge * 1e3),
                    })
                    const newTrustDeviceCookie = ctx.context.createAuthCookie(
                      TRUST_DEVICE_COOKIE_NAME,
                      { maxAge: trustDeviceMaxAge }
                    )
                    await ctx.setSignedCookie(
                      newTrustDeviceCookie.name,
                      `${newToken}!${newTrustIdentifier}`,
                      ctx.context.secret,
                      trustDeviceCookieAttrs.attributes
                    )
                    mirrorSetCookieHeadersToAuthContext(ctx)
                    return
                  }
                }
              }
              expireCookie(ctx, trustDeviceCookieAttrs)
            }

            deleteSessionCookie(ctx, true)
            await ctx.context.internalAdapter.deleteSession(data.session.token)
            ctx.context.setNewSession(null)

            // Better Auth `verify-otp` calls `valid()` only when `twoFactorEnabled` is true on sign-in
            // challenges (`session.session` is null). IAM login OTP is policy-driven, not optional 2FA.
            if (!data.user.twoFactorEnabled) {
              await ctx.context.internalAdapter.updateUser(data.user.id, {
                twoFactorEnabled: true,
              })
            }

            const twoFactorCookie = ctx.context.createAuthCookie(TWO_FACTOR_COOKIE_NAME, {
              maxAge: twoFactorCookieMaxAge,
            })
            const identifier = `2fa-${generateRandomString(20)}`
            const expiresAt = new Date(Date.now() + twoFactorCookieMaxAge * 1e3)
            await ctx.context.internalAdapter.createVerificationValue({
              value: data.user.id,
              identifier,
              expiresAt,
            })
            await ctx.context.internalAdapter.createVerificationValue({
              value: '0',
              identifier: `2fa-attempts-${identifier}`,
              expiresAt,
            })
            await ctx.setSignedCookie(
              twoFactorCookie.name,
              identifier,
              ctx.context.secret,
              twoFactorCookie.attributes
            )
            mirrorSetCookieHeadersToAuthContext(ctx)

            const otp = generateRandomString(host.loginOtp.length, '0-9')
            const otpExpiresAt = new Date(Date.now() + LOGIN_OTP_EMAIL_EXPIRES_MINUTES * 60 * 1000)
            const storedOtp = await hashLoginOtpForStorage(otp)
            await ctx.context.internalAdapter.createVerificationValue({
              value: `${storedOtp}:0`,
              identifier: `2fa-otp-${identifier}`,
              expiresAt: otpExpiresAt,
            })
            const signInEmail = signInEmailFromLoginBody(ctx.body)
            const to = await resolveLoginOtpRecipient(
              host,
              data.user.id,
              data.user.email ?? signInEmail
            )
            const loginOtpEmail = to ?? (signInEmail || data.user.email?.trim() || '')
            if (loginOtpEmail) {
              await host.sendLoginOtpEmail({
                to: loginOtpEmail,
                otp,
                expiresInMinutes: LOGIN_OTP_EMAIL_EXPIRES_MINUTES,
              })
            } else {
              host.onAudit?.({
                type: 'login-otp-no-recipient',
                userId: data.user.id,
              })
            }

            if (loginOtpEmail) {
              await ctx.context.internalAdapter.createVerificationValue({
                value: loginOtpEmail,
                identifier: loginOtpEmailVerificationId(identifier),
                expiresAt,
              })
              ctx.setCookie(LOGIN_OTP_EMAIL_HINT_COOKIE, loginOtpEmail, {
                ...twoFactorCookie.attributes,
                maxAge: twoFactorCookieMaxAge,
                httpOnly: false,
              })
              mirrorSetCookieHeadersToAuthContext(ctx)
            }

            return ctx.json({
              twoFactorRedirect: true,
              twoFactorMethods: ['otp'],
              email: loginOtpEmail || undefined,
            })
          }),
        },
      ],
    },
  }
}
