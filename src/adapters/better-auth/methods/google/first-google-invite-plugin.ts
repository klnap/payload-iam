import type { BetterAuthPlugin } from 'better-auth'
import { createAuthEndpoint, createAuthMiddleware } from 'better-auth/api'
import * as z from 'zod'
import { adminLoginUrl } from '#iam/adapters/better-auth/auth-login-errors'
import { normalizeEmail } from '#iam/adapters/email/email'
import { PAYLOAD_RBAC_OPERATION } from '#iam/adapters/payload/operation-als'
import {
  INVITE_FLOW_RESPONSE_HEADERS,
  jsonWithInviteFlowHeaders,
} from '#iam/modules/invitations/http/invite-flow-response-headers'
import { completeInvitationAccept } from '#iam/modules/invitations/services/accept/invite-accept-finish'
import { validateInviteAcceptPrelude } from '#iam/modules/invitations/services/accept/invite-accept-prelude'
import { IAM_AUTH_ROUTES } from '#iam/shared/paths/auth-routes'
import type { HostRuntimeDeps } from '#iam/types/config'
import {
  buildInviteGoogleClearCookieHeader,
  type InviteGoogleCookiePayload,
  parseInviteGoogleCookie,
  readInviteGoogleCookieFromRequest,
} from './invite-google-cookie'

const CALLBACK_PATHS = new Set([
  IAM_AUTH_ROUTES.google.callback,
  `${IAM_AUTH_ROUTES.google.callback}/`,
  IAM_AUTH_ROUTES.betterAuth.callbackGoogle,
  `${IAM_AUTH_ROUTES.betterAuth.callbackGoogle}/`,
])

type BindFn = (args: {
  invitationId: string
  token: string
}) => Promise<{ ok: true; setCookie: string } | { error: string }>

type AuthContext = {
  $context: Promise<{
    internalAdapter: {
      findVerificationValue: (
        id: string
      ) => Promise<{ value: string; invitationId?: string } | null>
    }
  }>
}

export function firstGoogleInvitePlugin(
  host: HostRuntimeDeps,
  auth: AuthContext,
  deps: {
    secret: string
    bindInviteGoogle: BindFn
  }
): BetterAuthPlugin {
  const loginErrorUrl = adminLoginUrl(host)

  return {
    id: 'payload-iam-first-google-invite',
    endpoints: {
      inviteBindGoogle: createAuthEndpoint(
        IAM_AUTH_ROUTES.google.inviteBind,
        {
          method: 'POST',
          body: z
            .object({
              invitationId: z.string().min(1),
              token: z.string().min(1),
            })
            .strict(),
        },
        async (ctx) => {
          const result = await deps.bindInviteGoogle({
            invitationId: ctx.body.invitationId,
            token: ctx.body.token,
          })
          if ('error' in result) {
            return jsonWithInviteFlowHeaders({ error: result.error }, { status: 400 })
          }
          const headers = new Headers(INVITE_FLOW_RESPONSE_HEADERS as Record<string, string>)
          headers.set('Content-Type', 'application/json')
          headers.set('Set-Cookie', result.setCookie)
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers,
          })
        }
      ),
    },
    hooks: {
      before: [
        {
          matcher: (ctx) => Boolean(ctx.path && CALLBACK_PATHS.has(ctx.path)),
          handler: createAuthMiddleware(async (ctx) => {
            if (!ctx.request) return
            const raw = readInviteGoogleCookieFromRequest(ctx.request)
            const payload = parseInviteGoogleCookie(deps.secret, raw)
            if (!payload) return
            PAYLOAD_RBAC_OPERATION.enterWith({
              kind: 'FIRST_GOOGLE',
              userId: payload.userId,
              provisioningOperationId: payload.provisioningOperationId,
            })
            ;(
              ctx.context as { payloadRbacInviteGoogle?: InviteGoogleCookiePayload }
            ).payloadRbacInviteGoogle = payload
          }),
        },
      ],
      after: [
        {
          matcher: (ctx) => Boolean(ctx.path && CALLBACK_PATHS.has(ctx.path)),
          handler: createAuthMiddleware(async (ctx) => {
            const binding = (ctx.context as { payloadRbacInviteGoogle?: InviteGoogleCookiePayload })
              .payloadRbacInviteGoogle
            if (!binding) return

            const returned = (ctx.context as { returned?: unknown }).returned as
              | { user?: { id?: string; email?: string } }
              | Response
              | null
              | undefined

            if (returned instanceof Response) return

            const oauthUserId = returned?.user?.id ? String(returned.user.id) : ''
            const oauthEmail = returned?.user?.email
              ? normalizeEmail(String(returned.user.email))
              : ''

            const emailOk = oauthEmail && oauthEmail === normalizeEmail(binding.email)
            const userOk = oauthUserId && oauthUserId === binding.userId

            if (!emailOk || !userOk) {
              ctx.context.returned = new Response(null, {
                status: 302,
                headers: {
                  Location: `${loginErrorUrl}?authError=invite_email_mismatch`,
                  'Set-Cookie': buildInviteGoogleClearCookieHeader(),
                },
              })
              return
            }

            const validated = await validateInviteAcceptPrelude(host, auth, {
              invitationId: binding.invitationId,
              token: binding.token,
            })
            if ('error' in validated) {
              ctx.context.returned = new Response(null, {
                status: 302,
                headers: {
                  Location: loginErrorUrl,
                  'Set-Cookie': buildInviteGoogleClearCookieHeader(),
                },
              })
              return
            }

            const finished = await completeInvitationAccept(host, {
              prelude: validated.prelude,
              provisioningOperationId: binding.provisioningOperationId,
              userId: binding.userId,
            })

            const headers = new Headers()
            headers.append('Set-Cookie', buildInviteGoogleClearCookieHeader())
            if ('error' in finished) {
              ctx.context.returned = new Response(null, {
                status: 302,
                headers: {
                  Location: loginErrorUrl,
                  'Set-Cookie': buildInviteGoogleClearCookieHeader(),
                },
              })
              return
            }

            if (returned && typeof returned === 'object') {
              ;(ctx.context as { returned?: unknown }).returned = {
                ...returned,
                headers,
              }
            }
          }),
        },
      ],
    },
  }
}
