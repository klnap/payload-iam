import { PostgresDialect } from 'kysely'
import type { Payload } from 'payload'
import {
  renderInvitationEmail,
  renderLoginOtpEmail,
  renderResetPasswordEmail,
  renderSetPasswordEmail,
} from '#iam/adapters/email/render-transactional-emails'
import { deliverPayloadEmail } from '#iam/adapters/payload/deliver-payload-email'
import { BA_SCHEMA } from '#iam/adapters/pg/ensure-auth-schema'
import {
  consumeRateLimit,
  createDbNow,
  createDedicatedLockPool,
  createWithAdvisoryLocks,
  extractPool,
  type PgPool,
  resolveTrustedOrigins,
} from '#iam/adapters/pg/pg-host'
import { resolveLoginOtpFromOptions } from '#iam/modules/auth/methods/email-and-password/config/login-otp.config'
import { hashServiceToken } from '#iam/modules/auth/services/pre-payload-service-auth'
import { resolveAuthMethods, toBetterAuthHostOptions } from '#iam/plugin/auth/resolve-auth-config'
import type { HostRuntimeDeps, IamOptions } from '#iam/types/config'

export type BuiltHost = HostRuntimeDeps & {
  payloadPool: PgPool
  lockPool: PgPool
}

export function buildHostFromPayload(payload: Payload, opts: IamOptions): BuiltHost {
  const payloadPool = extractPool(payload)
  const lockPool = createDedicatedLockPool(payloadPool)
  const baseURL = payload.config.serverURL
  if (!baseURL) {
    throw new Error('payload-iam: payload.config.serverURL is required')
  }
  const payloadSecret = payload.secret
  if (!payloadSecret || payloadSecret.length < 24) {
    throw new Error('payload-iam: payload.secret required for service auth')
  }

  const appName =
    (typeof payload.config.admin?.meta?.title === 'string' && payload.config.admin.meta.title) ||
    'Payload'

  const loginOtp = resolveLoginOtpFromOptions(opts)
  const authMethods = resolveAuthMethods(opts)
  const getPayload = async () => payload

  return {
    payloadPool,
    lockPool,
    database: {
      dialect: new PostgresDialect({ pool: payloadPool as never }),
      type: 'postgres' as const,
      schemaName: BA_SCHEMA,
      transaction: true,
    } as HostRuntimeDeps['database'],
    getPayload,
    withAdvisoryLocks: createWithAdvisoryLocks(lockPool),
    dbNow: createDbNow(payloadPool),
    consumeRateLimit,
    baseURL,
    adminRoute: payload.config.routes?.admin ?? '/admin',
    trustedOrigins: resolveTrustedOrigins(payload.config),
    appName,
    betterAuthOptions: toBetterAuthHostOptions(opts),
    onAudit: opts.onAudit,
    serviceTokens: [
      {
        id: 'payload',
        hash: hashServiceToken(payloadSecret),
        active: true,
      },
    ],
    sendInviteEmail: async ({ to, inviteUrl, expiresAt }) => {
      if (process.env.NODE_ENV !== 'production') {
        payload.logger.info(`[dev-mail] to=${to} subject="You've been invited" link=${inviteUrl}`)
      }
      const { html, text, subject } = await renderInvitationEmail({
        payload,
        options: opts,
        to,
        inviteUrl,
        expiresAt,
        appName,
      })
      await deliverPayloadEmail(getPayload, {
        to,
        subject,
        html,
        text,
      })
    },
    sendResetEmail: async ({ to, resetUrl, expiresAt }) => {
      const { html, text, subject } = await renderResetPasswordEmail({
        payload,
        options: opts,
        to,
        resetUrl,
        expiresAt,
        appName,
      })
      await deliverPayloadEmail(getPayload, {
        to,
        subject,
        html,
        text,
      })
    },
    sendSetPasswordEmail: async ({ to, setPasswordUrl, expiresAt }) => {
      const { html, text, subject } = await renderSetPasswordEmail({
        payload,
        options: opts,
        to,
        setPasswordUrl,
        expiresAt,
        appName,
      })
      await deliverPayloadEmail(getPayload, {
        to,
        subject,
        html,
        text,
      })
    },
    sendLoginOtpEmail: async ({ to, otp, expiresInMinutes }) => {
      const { html, text, subject } = await renderLoginOtpEmail({
        payload,
        options: opts,
        to,
        otp,
        expiresInMinutes,
        appName,
      })
      await deliverPayloadEmail(getPayload, {
        to,
        subject,
        html,
        text,
      })
    },
    loginOtp,
    authMethods,
  }
}
