import type { Plugin } from 'payload'
import { createAuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { setRegisteredHost } from '#iam/adapters/payload/host-registry'
import { ensureAuthSchema } from '#iam/adapters/pg/ensure-auth-schema'
import { extractPool } from '#iam/adapters/pg/pg-host'
import { createUnlinkGoogleAccount } from '#iam/modules/account/services/unlink-google-account'
import { resolveLoginOtpFromOptions } from '#iam/modules/auth/methods/email-and-password/config/login-otp.config'
import { createChangePassword } from '#iam/modules/auth/methods/email-and-password/services/change-password'
import { createCompleteSetPassword } from '#iam/modules/auth/methods/email-and-password/services/complete-set-password'
import { createRequestPasswordEmail } from '#iam/modules/auth/methods/email-and-password/services/request-password-email'
import { createSendPasswordReset } from '#iam/modules/auth/methods/email-and-password/services/send-password-reset'
import { createSendSetPassword } from '#iam/modules/auth/methods/email-and-password/services/send-set-password'
import { createSetPassword } from '#iam/modules/auth/methods/email-and-password/services/set-password'
import { createPrePayloadServiceAuth } from '#iam/modules/auth/services/pre-payload-service-auth'
import { createReconcile } from '#iam/modules/bootstrap/services/reconcile'
import { createBindInviteGoogle } from '#iam/modules/invitations/services/accept/bind-invite-google'
import { createAcceptInvite } from '#iam/modules/invitations/services/accept/invite-accept'
import {
  createExpireInvitation,
  createRevokeInvitation,
} from '#iam/modules/invitations/services/expiry/invitation-expire-revoke'
import { issueInviteReset as issueInviteResetImpl } from '#iam/modules/invitations/services/provisioning/issue-invite-reset'
import { createTransferRoot } from '#iam/modules/rbac/services/transfer-root'
import { createSessionsService } from '#iam/modules/sessions/services/create-sessions-service'
import { createCreateSharedUser } from '#iam/modules/users/services/create-shared-user'
import { createDeleteSharedUser } from '#iam/modules/users/services/delete-shared-user'
import { loadUserAuthAccountInsights } from '#iam/modules/users/services/user-document-enrichment'
import { composeBetterAuthOptions, createPrivateAuth } from '#iam/plugin/auth/compose-auth-options'
import { resolveAuthMethods } from '#iam/plugin/auth/resolve-auth-config'
import { createPayloadPlugin } from '#iam/plugin/payload-plugin'
import { resolveRbacRegisterConfig, toRbacRegisterTabs } from '#iam/plugin/resolve-register-config'
import { validateHostRuntime, validateIamOptions } from '#iam/plugin/validate-config'
import type {
  HostRuntimeDeps,
  IamApi,
  IamOptions,
  IamSurface,
  PayloadIamRuntime,
  PrePayloadServiceAuth,
} from '#iam/types/config'
import { validateRbacModulesToggle } from '#iam/types/modules'
import { buildHostFromPayload } from './build-host'
import { assertIamRuntimeSelfCheck } from './runtime-self-check'

type IamGlobal = typeof globalThis & {
  __klnapPayloadIam?: IamSurface
  __klnapPayloadIamPreAuth?: PrePayloadServiceAuth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __klnapPayloadIamAuth?: any
}

const g = globalThis as IamGlobal

/** Survive Turbopack/HMR module re-eval (Payload singleton stays; module lets do not). */
function setRegistered(surface: IamSurface, preAuth: PrePayloadServiceAuth, auth: unknown) {
  g.__klnapPayloadIam = surface
  g.__klnapPayloadIamPreAuth = preAuth
  g.__klnapPayloadIamAuth = auth
}

export function getRegisteredIam(): IamSurface {
  const surface = g.__klnapPayloadIam
  if (!surface) {
    throw new Error('payload-iam: iam not initialized — wait for Payload onInit')
  }
  return surface
}

export function getPrivateAuth(): any {
  const auth = g.__klnapPayloadIamAuth
  if (!auth) {
    throw new Error('payload-iam: iam not initialized')
  }
  return auth
}

function toSurface(handler: IamSurface['handler'], api: IamApi): IamSurface {
  return { handler, api }
}

/** Build sealed runtime from internal host deps. */
export function createPayloadIamRuntime(host: HostRuntimeDeps): Omit<
  PayloadIamRuntime,
  'payloadPlugin'
> & {
  prePayloadServiceAuth: PrePayloadServiceAuth
} {
  validateHostRuntime(host)

  let acceptInvite: IamApi['acceptInvite'] = async () => {
    throw new Error('payload-iam: auth not ready')
  }
  let completeSetPassword: (args: { token: string; password: string }) => Promise<unknown> =
    async () => {
      throw new Error('payload-iam: auth not ready')
    }
  let bindInviteGoogle: (body: {
    invitationId: string
    token: string
  }) => Promise<{ ok: true; setCookie: string } | { error: string }> = async () => ({
    error: 'not_ready',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let auth: any
  const options = composeBetterAuthOptions({
    host,
    acceptInvite: (body) => acceptInvite(body),
    completeSetPassword: (body) => completeSetPassword(body),
    bindInviteGoogle: (body) => bindInviteGoogle(body),
    getAuthForInviteGoogle: () => auth,
    getAuthHandler: () => auth.handler.bind(auth),
  })

  auth = createPrivateAuth(options)
  const facade = createAuthUsersFacade(auth)
  const authSecret = host.betterAuthOptions.secret
  if (!authSecret) {
    throw new Error('payload-iam: betterAuth secret required')
  }
  bindInviteGoogle = createBindInviteGoogle(host, auth, authSecret, facade)
  const sessionsService = createSessionsService(auth)

  acceptInvite = createAcceptInvite(host, facade, auth)
  const setPassword = createSetPassword(host, facade)
  completeSetPassword = createCompleteSetPassword(host, facade, auth, setPassword)
  const sendPasswordReset = createSendPasswordReset(host, facade, auth)
  const sendSetPassword = createSendSetPassword(host, facade, auth)
  const transferRoot = createTransferRoot(host)
  const unlinkGoogleAccount = createUnlinkGoogleAccount(host, facade, auth)

  const prePayloadServiceAuth = createPrePayloadServiceAuth(host)

  const api: IamApi = {
    createSharedUser: createCreateSharedUser(host, facade),
    deleteSharedUser: createDeleteSharedUser(host, facade),
    issueInviteReset: (args) => issueInviteResetImpl(host, facade, args),
    expireInvitation: createExpireInvitation(host, facade),
    revokeInvitation: createRevokeInvitation(host, facade),
    acceptInvite,
    setPassword,
    changePassword: createChangePassword(host, facade, auth),
    sendPasswordReset,
    sendSetPassword,
    requestPasswordEmail: createRequestPasswordEmail(host, facade, auth, {
      sendPasswordReset,
      sendSetPassword,
    }),
    listUserSessions: async ({ targetUserId, headers }) => {
      const currentSessionToken = await sessionsService.resolveCurrentSessionToken(headers)
      return sessionsService.listSessionsForUser({
        targetUserId,
        currentSessionToken,
      })
    },
    revokeUserSession: async ({ targetUserId, token }) => {
      await sessionsService.revokeSessionForUser({ targetUserId, token })
      return { ok: true }
    },
    revokeAllUserSessions: async ({ targetUserId }) => {
      await sessionsService.revokeAllSessionsForUser(targetUserId)
      return { ok: true }
    },
    userHasPasswordLogin: async ({ userId }) => Boolean(await facade.findCredentialAccount(userId)),
    getUserAuthAccountInsights: async ({ userId }) => {
      const payload = await host.getPayload()
      return loadUserAuthAccountInsights({
        payload,
        userId,
        googleLoginEnabled: host.authMethods.google,
        getAuth: () => auth,
      })
    },
    unlinkGoogleAccount,
    transferRoot,
    reconcile: createReconcile(host, facade),
  }

  const handler = (request: Request) => auth.handler(request)
  const surface = toSurface(handler, api)
  setRegisteredHost(host)
  setRegistered(surface, prePayloadServiceAuth, auth)

  return { handler, api, prePayloadServiceAuth }
}

/**
 * Payload IAM plugin — `plugins: [IAM({ secret, methods })]`.
 *
 * Server URL, DB, trusted origins come from Payload config.
 * After boot: `payload.iam.handler` / `payload.iam.api.*`.
 * Service auth: `X-Payload-Service-Token: <PAYLOAD_SECRET>`.
 */
export function IAM(options: IamOptions): Plugin {
  validateIamOptions(options)

  const authMethods = resolveAuthMethods(options)
  const loginOtp = resolveLoginOtpFromOptions(options)
  const loginFlags = {
    emailAndPassword: authMethods.emailAndPassword,
    google: authMethods.google,
    loginOtp: authMethods.loginOtp,
    forgotPassword: authMethods.forgotPassword,
    length: loginOtp.length,
  }

  const modules = validateRbacModulesToggle(options.modules)
  const register = toRbacRegisterTabs(resolveRbacRegisterConfig(options, modules))

  return createPayloadPlugin({
    users: options.users,
    loginFlags,
    register,
    modules,
    getAuth: () => getPrivateAuth(),
    getServicePrincipalFromHeaders: async (headers) => {
      const preAuth = g.__klnapPayloadIamPreAuth
      if (!preAuth) return null
      const probe = new Request('http://payload-iam.invalid/', { headers })
      const result = await preAuth(probe)
      if (result instanceof Response || result === null) return null
      return result
    },
    onReady: async (payload, usersSlug) => {
      const pool = extractPool(payload)
      await ensureAuthSchema(pool)
      const host = buildHostFromPayload(payload, options)
      assertIamRuntimeSelfCheck({
        payload,
        payloadPool: host.payloadPool,
        lockPool: host.lockPool,
        usersSlug,
        publishTargets: [],
      })
      const runtime = createPayloadIamRuntime(host)
      ;(payload as { iam?: IamSurface }).iam = toSurface(runtime.handler, runtime.api)
    },
  })
}

/** @deprecated Use `IAM` — kept for existing hosts. */
export const iam = IAM
