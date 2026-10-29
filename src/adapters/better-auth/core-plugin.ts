import type { BetterAuthPlugin } from 'better-auth'
import { createAuthEndpoint } from 'better-auth/api'
import * as z from 'zod'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { isStrongPassword, passwordPolicyMessage } from '#iam/core/identity/password-policy'
import { jsonWithInviteFlowHeaders } from '#iam/modules/invitations/http/invite-flow-response-headers'
import { IAM_AUTH_ROUTES } from '#iam/shared/paths/auth-routes'
import type { HostRuntimeDeps } from '#iam/types/config'
import { buildLoginRedirectForAuthError } from './auth-login-errors'
import { forwardIamAuthRequest } from './auth-request-forward'
import { handlePendingLoginOtpEmail } from './pending-login-otp-email'
import type { AuthMethodFlags } from './security/http-allowlist'
import { createAllowlistGate } from './security/http-allowlist'

type AuthHandler = (request: Request) => Response | Promise<Response>

function requireRequest(request: Request | undefined): Request | Response {
  if (request) return request
  return Response.json({ error: 'Bad Request' }, { status: 400 })
}

/**
 * Last IAM plugin before `nextCookies()`: HTTP METHOD+PATH allowlist + IAM routes.
 * Do not append other plugins after `nextCookies()` in compose-auth-options.
 */
export function payloadRbacCorePlugin(deps: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  acceptInvite: (args: any) => Promise<unknown>
  completeSetPassword: (args: { token: string; password: string }) => Promise<unknown>
  authMethods: AuthMethodFlags
  baseURL: string
  adminRoute: string
  basePath: string
  host: HostRuntimeDeps
  getAuthHandler: () => AuthHandler
  getAuthContext: () => {
    $context: Promise<{
      internalAdapter: {
        findVerificationValue: (id: string) => Promise<{ value: string } | null>
      }
    }>
  }
}): BetterAuthPlugin {
  const gate = createAllowlistGate(deps.authMethods)
  const forwardJson = (request: Request | undefined, targetPath: string, body: unknown) => {
    const req = requireRequest(request)
    if (req instanceof Response) return req
    return forwardIamAuthRequest(deps.getAuthHandler, req, targetPath, JSON.stringify(body ?? {}))
  }
  const forwardGet = (request: Request | undefined, targetPath: string) => {
    const req = requireRequest(request)
    if (req instanceof Response) return req
    return forwardIamAuthRequest(deps.getAuthHandler, req, targetPath)
  }

  const iamPostBody = z.record(z.string(), z.unknown())

  const endpoints: BetterAuthPlugin['endpoints'] = {
    inviteAccept: createAuthEndpoint(
      IAM_AUTH_ROUTES.invitations.accept,
      {
        method: 'POST',
        body: z
          .object({
            invitationId: z.string().min(1),
            token: z.string().min(1),
            password: z
              .string()
              .optional()
              .refine((v) => v === undefined || v === '' || isStrongPassword(v), {
                message: passwordPolicyMessage(),
              }),
          })
          .strict(),
      },
      async (ctx) => {
        const rawPassword = ctx.body.password
        const result = await deps.acceptInvite({
          invitationId: ctx.body.invitationId,
          token: ctx.body.token,
          password: rawPassword === undefined || rawPassword === '' ? undefined : rawPassword,
          request: ctx.request,
        })
        return jsonWithInviteFlowHeaders(result as Record<string, unknown>)
      }
    ),
    completeSetPassword: createAuthEndpoint(
      IAM_AUTH_ROUTES.emailAndPassword.setPassword,
      {
        method: 'POST',
        body: z
          .object({
            token: z.string().min(1),
            newPassword: z.string().refine(isStrongPassword, {
              message: passwordPolicyMessage(),
            }),
          })
          .strict(),
      },
      async (ctx) => {
        try {
          const result = await deps.completeSetPassword({
            token: ctx.body.token,
            password: ctx.body.newPassword,
          })
          return ctx.json(result as Record<string, unknown>)
        } catch {
          return ctx.json({ error: 'invalid_token' }, { status: 400 })
        }
      }
    ),
    requestPasswordResetCallbackBlocked: createAuthEndpoint(
      '/reset-password/:token',
      { method: 'GET' },
      async () => new Response('Not Found', { status: 404 })
    ),
    emailAndPasswordSignIn: createAuthEndpoint(
      IAM_AUTH_ROUTES.emailAndPassword.signIn,
      {
        method: 'POST',
        body: z.object({
          email: z.string().min(1),
          password: z.string().min(1),
          callbackURL: z.string().optional(),
          rememberMe: z.boolean().optional(),
        }),
      },
      async (ctx) => forwardJson(ctx.request, IAM_AUTH_ROUTES.betterAuth.signInEmail, ctx.body)
    ),
    emailAndPasswordResetPassword: createAuthEndpoint(
      IAM_AUTH_ROUTES.emailAndPassword.resetPassword,
      {
        method: 'POST',
        body: z
          .object({
            token: z.string().min(1),
            newPassword: z.string().refine(isStrongPassword, {
              message: passwordPolicyMessage(),
            }),
          })
          .strict(),
      },
      async (ctx) => {
        const token = ctx.body.token
        const authCtx = await deps.getAuthContext().$context
        const verification = await authCtx.internalAdapter.findVerificationValue(
          `reset-password:${token}`
        )
        const userId = verification?.value
        return runWithInternalOperation({ kind: 'GENERIC_RESET', userId }, async () =>
          forwardJson(ctx.request, IAM_AUTH_ROUTES.betterAuth.resetPassword, ctx.body)
        )
      }
    ),
    loginOtpPendingEmail: createAuthEndpoint(
      IAM_AUTH_ROUTES.emailAndPassword.loginOtp.pendingEmail,
      { method: 'GET' },
      async (ctx) =>
        handlePendingLoginOtpEmail(
          deps.host,
          ctx as unknown as Parameters<typeof handlePendingLoginOtpEmail>[1]
        )
    ),
    loginOtpSend: createAuthEndpoint(
      IAM_AUTH_ROUTES.emailAndPassword.loginOtp.send,
      {
        method: 'POST',
        body: z
          .object({
            trustDevice: z.boolean().optional(),
          })
          .optional(),
      },
      async (ctx) =>
        forwardJson(ctx.request, IAM_AUTH_ROUTES.betterAuth.twoFactorSendOtp, ctx.body ?? {})
    ),
    loginOtpVerify: createAuthEndpoint(
      IAM_AUTH_ROUTES.emailAndPassword.loginOtp.verify,
      {
        method: 'POST',
        body: z
          .object({
            code: z.string().min(1),
            trustDevice: z.boolean().optional(),
          })
          .strict(),
      },
      async (ctx) =>
        forwardJson(ctx.request, IAM_AUTH_ROUTES.betterAuth.twoFactorVerifyOtp, ctx.body)
    ),
    googleSignIn: createAuthEndpoint(
      IAM_AUTH_ROUTES.google.signIn,
      { method: 'POST', body: iamPostBody },
      async (ctx) => forwardJson(ctx.request, IAM_AUTH_ROUTES.betterAuth.signInSocial, ctx.body)
    ),
    googleCallback: createAuthEndpoint(
      IAM_AUTH_ROUTES.google.callback,
      { method: 'GET' },
      async (ctx) => forwardGet(ctx.request, IAM_AUTH_ROUTES.betterAuth.callbackGoogle)
    ),
    googleLink: createAuthEndpoint(
      IAM_AUTH_ROUTES.google.link,
      { method: 'POST', body: iamPostBody },
      async (ctx) => forwardJson(ctx.request, IAM_AUTH_ROUTES.betterAuth.linkSocial, ctx.body)
    ),
    googleUnlink: createAuthEndpoint(
      IAM_AUTH_ROUTES.google.unlink,
      { method: 'POST', body: iamPostBody },
      async (ctx) => forwardJson(ctx.request, IAM_AUTH_ROUTES.betterAuth.unlinkAccount, ctx.body)
    ),
    googleListAccounts: createAuthEndpoint(
      IAM_AUTH_ROUTES.google.listAccounts,
      { method: 'GET' },
      async (ctx) => forwardGet(ctx.request, IAM_AUTH_ROUTES.betterAuth.listAccounts)
    ),
  }

  return {
    id: 'payload-iam-core',
    endpoints,
    onRequest: async (request) => {
      const authErrorRedirect = buildLoginRedirectForAuthError({
        requestUrl: request.url,
        basePath: deps.basePath,
        baseURL: deps.baseURL,
        adminRoute: deps.adminRoute,
      })
      if (authErrorRedirect) return { response: authErrorRedirect }

      const denied = gate(request, deps.basePath)
      if (denied) return { response: denied }
      return { request }
    },
  }
}
