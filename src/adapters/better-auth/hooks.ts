import { APIError } from 'better-auth/api'
import { normalizeEmail } from '#iam/adapters/email/email'
import { getInternalOperation } from '#iam/adapters/payload/operation-als'
import { newId } from '#iam/core/identity/ids'
import type { HostRuntimeDeps } from '#iam/types/config'
import {
  canProvisionedUserLinkGoogle,
  createGoogleLinkGuardDeps,
} from './methods/google/google-account-link'
import {
  allowAccountUpdateDuringOAuth,
  allowUserEmailVerifiedDuringOAuth,
  isOAuthCallbackEndpoint,
  looksLikeOAuthAccountPatch,
} from './methods/google/oauth-callback-context'
import { isBetterAuthManagedVerification } from './security/verification-allow'

/** Deny session create. Prefer throw (skips BA ERROR); false = abort → remap logger. */
function denySession(logger?: { warn: (message: string) => void }): never {
  logger?.warn('Inactive user')
  throw APIError.from('UNAUTHORIZED', {
    code: 'INVALID_EMAIL_OR_PASSWORD',
    message: 'Invalid email or password',
  })
}

type HookCtx = {
  host: HostRuntimeDeps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authApi: any
}

const IDENTITY_FIELDS = new Set(['providerId', 'accountId', 'userId'])
const OAUTH_TOKEN_FIELDS = new Set([
  'accessToken',
  'refreshToken',
  'idToken',
  'accessTokenExpiresAt',
  'refreshTokenExpiresAt',
  'scope',
  'updatedAt',
])

/** BA OAuth sign-in / link refresh includes `providerId` with tokens (link-account.mjs). */
const OAUTH_ACCOUNT_UPDATE_FIELDS = new Set([...OAUTH_TOKEN_FIELDS, 'providerId'])

function definedKeys(data: Record<string, unknown>): string[] {
  return Object.keys(data).filter((k) => data[k] !== undefined)
}

function isOAuthAccountMaintenanceUpdate(data: Record<string, unknown>): boolean {
  const keys = definedKeys(data)
  if (keys.length === 0) return false
  if (keys.includes('accountId') || keys.includes('userId') || keys.includes('password')) {
    return false
  }
  return keys.every((k) => OAUTH_ACCOUNT_UPDATE_FIELDS.has(k))
}

export function buildDatabaseHooks(ctx: HookCtx) {
  const googleLinkGuards = createGoogleLinkGuardDeps(ctx.host)

  return {
    user: {
      update: {
        before: async (data: Record<string, unknown>, endpointCtx?: unknown) => {
          if (allowUserEmailVerifiedDuringOAuth(data, endpointCtx)) {
            return { data }
          }
          const keys = Object.keys(data).filter((k) => data[k] !== undefined)
          if (
            !getInternalOperation() &&
            keys.length > 0 &&
            keys.every(
              (k) => k === 'emailVerified' || k === 'updatedAt' || k === 'twoFactorEnabled'
            )
          ) {
            return { data }
          }
          return false as const // DENY ALL — Payload is profile SoT
        },
      },
      delete: {
        before: async (_data: unknown) => {
          const op = getInternalOperation()
          if (
            op?.kind === 'USER_DELETE' ||
            op?.kind === 'FACADE_DELETE_USER' ||
            op?.kind === 'RECONCILE_REPAIR' ||
            op?.kind === 'BOOTSTRAP'
          ) {
            return
          }
          return false as const
        },
      },
    },
    session: {
      create: {
        before: async (
          session: Record<string, unknown>,
          endpointCtx?: { context?: { logger?: { warn: (m: string) => void } } }
        ) => {
          const userId = String(session.userId ?? '')
          const log = endpointCtx?.context?.logger
          if (!userId) denySession(log)
          const payload = await ctx.host.getPayload()
          const found = await payload.find({
            collection: 'users',
            where: { id: { equals: userId } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
          })
          const user = found.docs[0] as
            | {
                isActive?: boolean
                provisioningStatus?: string
              }
            | undefined
          if (!user || user.isActive === false) denySession(log)

          const op = getInternalOperation()
          if (
            user.provisioningStatus &&
            user.provisioningStatus !== 'none' &&
            op?.kind !== 'FIRST_GOOGLE'
          ) {
            denySession(log)
          }
          if (op?.kind === 'FIRST_GOOGLE') {
            // Ownership via durable provisioningId checked in account path;
            // session gate requires matching op + live pending invite CAS done by service.
            if (op.userId !== userId) denySession(log)
            if (!op.provisioningOperationId) denySession(log)
          }
          return { data: session }
        },
      },
      update: {
        before: async (data: Record<string, unknown>) => {
          const keys = Object.keys(data).filter((k) => data[k] !== undefined)
          for (const k of keys) {
            if (k !== 'expiresAt' && k !== 'updatedAt') return false as const
          }
          return { data }
        },
      },
    },
    account: {
      create: {
        before: async (account: Record<string, unknown>, endpointCtx?: unknown) => {
          const op = getInternalOperation()
          const providerId = String(account.providerId ?? '')

          if (providerId === 'credential') {
            if (
              op?.kind === 'INVITATION_ACCEPT_PROVISION' ||
              op?.kind === 'SET_PASSWORD' ||
              op?.kind === 'BOOTSTRAP'
            ) {
              const provisioningOperationId = op.provisioningOperationId ?? newId()
              return {
                data: {
                  ...account,
                  payloadRbacProvisioningId: provisioningOperationId,
                },
              }
            }
            // generic reset must not create first credential for zero-account invitees
            if (op?.kind === 'GENERIC_RESET') {
              return false as const
            }
            return false as const
          }

          if (providerId === 'google') {
            // Only explicit invite-first Google or authenticated /link-social — never
            // implicit email-match link during OAuth sign-in (OTP bypass / account takeover).
            if (op?.kind === 'FIRST_GOOGLE' || op?.kind === 'AUTHENTICATED_GOOGLE_LINK') {
              if (op.kind === 'AUTHENTICATED_GOOGLE_LINK') {
                const userId = String(account.userId ?? '')
                const allowed = await canProvisionedUserLinkGoogle(googleLinkGuards, userId)
                if (!allowed) return false as const
              }
              const provisioningOperationId = op.provisioningOperationId ?? newId()
              return {
                data: {
                  ...account,
                  payloadRbacProvisioningId: provisioningOperationId,
                },
              }
            }
            const oauthLinkUserId = String(account.userId ?? '')
            if (
              isOAuthCallbackEndpoint(endpointCtx) &&
              oauthLinkUserId &&
              (await canProvisionedUserLinkGoogle(googleLinkGuards, oauthLinkUserId))
            ) {
              return {
                data: {
                  ...account,
                  payloadRbacProvisioningId: newId(),
                },
              }
            }
            return false as const
          }

          return false as const
        },
        after: async () => {
          // audit only — invitation transitions happen in session gate / services
        },
      },
      update: {
        before: async (data: Record<string, unknown>, endpointCtx?: unknown) => {
          if (allowAccountUpdateDuringOAuth(data, endpointCtx)) {
            return { data }
          }
          if (!getInternalOperation() && looksLikeOAuthAccountPatch(data)) {
            return { data }
          }
          if (isOAuthAccountMaintenanceUpdate(data)) {
            return { data }
          }

          const op = getInternalOperation()
          const kind = op?.kind
          for (const k of Object.keys(data)) {
            if (IDENTITY_FIELDS.has(k)) return false as const
            if (k === 'payloadRbacProvisioningId') return false as const
          }
          if (kind === 'INVITATION_ACCEPT_PROVISION') return false as const
          if (kind === 'GENERIC_RESET' || kind === 'CHANGE_PASSWORD') {
            const keys = Object.keys(data).filter((k) => data[k] !== undefined)
            if (keys.every((k) => k === 'password' || k === 'updatedAt')) {
              return { data }
            }
            return false as const
          }
          if (kind === 'OAUTH_SIGN_IN' || kind === 'AUTHENTICATED_GOOGLE_LINK') {
            if (isOAuthAccountMaintenanceUpdate(data)) return { data }
            return false as const
          }
          return false as const
        },
      },
      delete: {
        before: async () => {
          const op = getInternalOperation()
          if (
            op?.kind === 'USER_DELETE' ||
            op?.kind === 'GOOGLE_ACCOUNT_ROLLBACK' ||
            op?.kind === 'RECONCILE_REPAIR' ||
            op?.kind === 'CREDENTIAL_COMPENSATION'
          ) {
            return
          }
          // allow BA unlink under authenticated session via classifier later
          if (op?.kind === 'AUTHENTICATED_GOOGLE_LINK') return false as const
          return false as const
        },
      },
    },
    verification: {
      create: {
        before: async (data: Record<string, unknown>) => {
          const op = getInternalOperation()
          const identifier = String(data.identifier ?? '')
          // `verification.storeIdentifier` uses plain overrides for `2fa-*` / `trust-device-*`
          // (see compose-auth-options). Invite flows set InternalOperation.
          if (
            op?.kind === 'INVITATION_ACCEPT_PROVISION' ||
            op?.kind === 'INVITATION_ISSUE' ||
            op?.kind === 'INVITATION_RESEND' ||
            op?.kind === 'BOOTSTRAP'
          ) {
            return { data }
          }
          if (
            op?.kind === 'GENERIC_RESET' ||
            op?.kind === 'SET_PASSWORD_EMAIL' ||
            // Legacy plain identifiers (pre-hash migration) or pre-hash hook view.
            identifier.startsWith('reset-password:') ||
            identifier.startsWith('set-password:')
          ) {
            // BA may create reset before our ALS wraps — allow reset-password prefix only
            // when no invite-bound invitationId is being set by stranger
            if (data.invitationId != null && !op) return false as const
            return { data }
          }
          if (isBetterAuthManagedVerification(data)) return { data }
          return false as const
        },
      },
      update: {
        before: async () => false as const,
      },
      delete: {
        before: async () => {
          const op = getInternalOperation()
          if (
            op?.kind === 'INVITATION_ACCEPT_PROVISION' ||
            op?.kind === 'INVITATION_RESEND' ||
            op?.kind === 'GENERIC_RESET' ||
            op?.kind === 'SET_PASSWORD_EMAIL' ||
            op?.kind === 'RECONCILE_REPAIR'
          ) {
            return
          }
          // BA consumeVerificationValue deletes — allow when no conflicting op
          return
        },
      },
    },
  }
}

export async function requireGoogleProviderVerified(userInfo: {
  emailVerified?: boolean
  email?: string
}): Promise<boolean> {
  return userInfo.emailVerified === true && Boolean(userInfo.email)
}

export { normalizeEmail }
