import type { BetterAuthOptions } from 'better-auth'
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { bearer, twoFactor } from 'better-auth/plugins'
import { adminLoginUrl } from '#iam/adapters/better-auth/auth-login-errors'
import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { unprefixedSessionCookies } from '#iam/adapters/better-auth/cookie-names'
import { payloadRbacCorePlugin } from '#iam/adapters/better-auth/core-plugin'
import { buildDatabaseHooks } from '#iam/adapters/better-auth/hooks'
import { createLoginOtpEnforcement } from '#iam/adapters/better-auth/login-otp-enforcement'
import { firstGoogleInvitePlugin } from '#iam/adapters/better-auth/methods/google/first-google-invite-plugin'
import { sessionDtoPlugin } from '#iam/adapters/better-auth/session-dto-plugin'
import { normalizeEmail } from '#iam/adapters/email/email'
import { resolveLoginOtpRecipient } from '#iam/adapters/email/resolve-login-otp-recipient'
import { newId } from '#iam/core/identity/ids'
import { PASSWORD_MIN_LENGTH } from '#iam/core/identity/password-policy'
import { validateSessionPolicy } from '#iam/plugin/validate-config'
import { IAM_AUTH_API_BASE_PATH } from '#iam/shared/paths/auth-api-path'
import type { HostRuntimeDeps } from '#iam/types/config'

export type ComposedAuth = ReturnType<typeof betterAuth>

/**
 * Merge host Better Auth options with Payload-derived + package hard rules.
 */
type BindInviteGoogleFn = (body: {
  invitationId: string
  token: string
}) => Promise<{ ok: true; setCookie: string } | { error: string }>

export function composeBetterAuthOptions(args: {
  host: HostRuntimeDeps
  acceptInvite: (body: {
    invitationId: string
    token: string
    password?: string
    request?: Request
  }) => Promise<unknown>
  completeSetPassword: (args: { token: string; password: string }) => Promise<unknown>
  bindInviteGoogle: BindInviteGoogleFn
  getAuthForInviteGoogle: () => {
    $context: Promise<{
      internalAdapter: {
        findVerificationValue: (
          id: string
        ) => Promise<{ value: string; invitationId?: string } | null>
      }
    }>
  }
  getAuthHandler: () => (request: Request) => Response | Promise<Response>
}): BetterAuthOptions {
  const { host } = args
  const user = host.betterAuthOptions
  const loginErrorUrl = adminLoginUrl(host)
  const sessionPolicy = validateSessionPolicy(user.session)

  const emailEnabled = user.emailAndPassword?.enabled !== false
  const rawGoogle = user.socialProviders?.google
  const google = rawGoogle && typeof rawGoogle !== 'function' ? rawGoogle : undefined
  const hostAccountLinking = user.account?.accountLinking
  const defaultTrustedLinkProviders = google ? (['google'] as const) : []
  const trustedLinkProviders = hostAccountLinking?.trustedProviders ?? [
    ...defaultTrustedLinkProviders,
  ]

  const userPlugins = Array.isArray(user.plugins) ? [...user.plugins] : []

  const defaultSendReset: NonNullable<
    NonNullable<BetterAuthOptions['emailAndPassword']>['sendResetPassword']
  > = async ({ user: u, token }) => {
    const resetUrl = `${host.baseURL.replace(/\/$/, '')}${host.adminRoute.replace(/\/$/, '')}/reset-password#token=${encodeURIComponent(token)}`
    await host.sendResetEmail({
      to: normalizeEmail(u.email),
      resetUrl,
      expiresAt: new Date(Date.now() + 3600_000),
    })
  }

  // Strip keys we overwrite so spread does not fight us
  const {
    emailAndPassword: _e,
    socialProviders: _s,
    session: _sess,
    account: _acc,
    user: _user,
    plugins: _p,
    advanced: _adv,
    rateLimit: _rl,
    onAPIError: _err,
    logger: userLogger,
    ...userRest
  } = user

  const loggerOpts = userLogger && typeof userLogger === 'object' ? { ...userLogger } : {}
  const prevLog =
    'log' in loggerOpts && typeof loggerOpts.log === 'function'
      ? loggerOpts.log.bind(loggerOpts)
      : undefined

  const options: BetterAuthOptions = {
    ...userRest,
    appName: host.appName,
    baseURL: host.baseURL,
    basePath: IAM_AUTH_API_BASE_PATH,
    secret: user.secret,
    database: host.database,
    trustedOrigins: host.trustedOrigins,
    // session.create.before abort → BA logger.error("Failed to create session").
    // Expected (inactive / gated) — same severity as invalid password.
    logger: {
      ...loggerOpts,
      log(level, message, ...args) {
        let lvl = level
        let msg = message
        if (lvl === 'error' && msg === 'Failed to create session') {
          lvl = 'warn'
          msg = 'Sign-in denied'
        }
        if (prevLog) {
          prevLog(lvl, msg, ...args)
          return
        }
        const line = `${new Date().toISOString()} ${lvl.toUpperCase()} [Better Auth]: ${msg}`
        if (lvl === 'error') console.error(line, ...args)
        else if (lvl === 'warn') console.warn(line, ...args)
        else console.log(line, ...args)
      },
    },
    advanced: {
      ...user.advanced,
      database: {
        ...user.advanced?.database,
        generateId: () => newId(),
        validateSchema: true,
      },
      crossSubDomainCookies: { enabled: false },
      cookies: unprefixedSessionCookies(user.advanced?.cookies),
    },
    user: {
      ...user.user,
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
      additionalFields: { ...user.user?.additionalFields },
    },
    session: {
      storeSessionInDatabase: true,
      preserveSessionInDatabase: false,
      cookieCache: { enabled: false },
      deferSessionRefresh: true,
      disableSessionRefresh: false,
      ...user.session,
      expiresIn: sessionPolicy.expiresIn,
      updateAge: sessionPolicy.updateAge,
      freshAge: sessionPolicy.freshAge,
    },
    emailAndPassword: emailEnabled
      ? {
          revokeSessionsOnPasswordReset: true,
          ...user.emailAndPassword,
          enabled: true,
          disableSignUp: true,
          // Enforce IAM password policy floor (host cannot lower below this).
          minPasswordLength: PASSWORD_MIN_LENGTH,
          sendResetPassword: user.emailAndPassword?.sendResetPassword ?? defaultSendReset,
        }
      : { enabled: false },
    verification: {
      // Hashed by default. Keep 2FA / trust-device plain so prefix guards + OTP hooks work.
      // Password reset/set identifiers are hashed (token not recoverable from DB alone).
      storeIdentifier: {
        default: 'hashed',
        overrides: {
          '2fa-': 'plain',
          'trust-device-': 'plain',
        },
      },
      additionalFields: {
        invitationId: {
          type: 'string',
          required: false,
          input: false,
          returned: false,
          unique: true,
        },
      },
    },
    account: {
      storeStateStrategy: 'database',
      storeAccountCookie: false,
      encryptOAuthTokens: true,
      ...user.account,
      accountLinking: {
        enabled: true,
        allowUnlinkingAll: false,
        updateUserInfoOnLink: false,
        ...hostAccountLinking,
        // Implicit link at BA layer; `account.create` hook enforces canProvisionedUserLinkGoogle.
        disableImplicitLinking: false,
        requireLocalEmailVerified: true,
        allowDifferentEmails: false,
        // BA `unable_to_link_account` when provider is missing from trustedProviders (see better-auth.com/docs/reference/errors/unable_to_link_account).
        trustedProviders: trustedLinkProviders,
      },
      additionalFields: {
        ...user.account?.additionalFields,
        payloadRbacProvisioningId: {
          type: 'string',
          required: false,
          input: false,
          returned: false,
          unique: true,
        },
      },
    },
    socialProviders: {
      ...user.socialProviders,
      ...(google
        ? {
            google: {
              overrideUserInfoOnSignIn: false,
              ...google,
              disableSignUp: true,
              disableImplicitSignUp: true,
            },
          }
        : {}),
    },
    databaseHooks: buildDatabaseHooks({
      host,
      authApi: null,
    }) as NonNullable<BetterAuthOptions['databaseHooks']>,
    rateLimit: {
      enabled: true,
      ...user.rateLimit,
      storage: 'database',
    },
    onAPIError: {
      ...user.onAPIError,
      errorURL: user.onAPIError?.errorURL ?? loginErrorUrl,
      onError: (error, ctx) => {
        host.onAudit?.({ type: 'ba-api-error', message: String(error) })
        user.onAPIError?.onError?.(error, ctx)
      },
    },
    plugins: [
      ...userPlugins,
      bearer(),
      ...(host.loginOtp.enabled
        ? [
            // Before BA `twoFactor` after hook — login OTP enforcement needs `newSession` and sends mail here.
            createLoginOtpEnforcement(host),
            twoFactor({
              totpOptions: { disable: true },
              otpOptions: {
                digits: host.loginOtp.length,
                storeOTP: 'hashed',
                allowedAttempts: 5,
                period: 3,
                sendOTP: async ({ user, otp }) => {
                  const to = await resolveLoginOtpRecipient(host, user.id, user.email)
                  if (!to) return
                  await host.sendLoginOtpEmail({
                    to,
                    otp,
                    expiresInMinutes: 3,
                  })
                },
              },
            }),
          ]
        : []),
      sessionDtoPlugin(host),
      firstGoogleInvitePlugin(host, args.getAuthForInviteGoogle(), {
        secret: user.secret ?? '',
        bindInviteGoogle: (body) => args.bindInviteGoogle(body),
      }),
      payloadRbacCorePlugin({
        acceptInvite: args.acceptInvite,
        completeSetPassword: args.completeSetPassword,
        authMethods: host.authMethods,
        baseURL: host.baseURL,
        adminRoute: host.adminRoute,
        basePath: IAM_AUTH_API_BASE_PATH,
        host,
        getAuthHandler: args.getAuthHandler,
        getAuthContext: args.getAuthForInviteGoogle,
      }),
      // After all plugins with `hooks.after` — forwards Set-Cookie into Next.js `cookies()`.
      nextCookies(),
    ],
  }

  return options
}

export function createPrivateAuth(options: BetterAuthOptions): ComposedAuth {
  return betterAuth(options)
}

export type { AuthUsersFacade }
