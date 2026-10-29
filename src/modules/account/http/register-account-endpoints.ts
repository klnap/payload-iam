import type { Endpoint, Payload } from 'payload'
import { isStrongPassword, passwordPolicyMessage } from '#iam/core/identity/password-policy'
import {
  ACCOUNT_API_PATH,
  ACCOUNT_LINK_METHOD,
  ACCOUNT_UNLINK_METHOD,
} from '#iam/shared/paths/account-api-paths'
import type { IamApi } from '#iam/types/config'

type AccountEndpointCtx = {
  forgotPassword: boolean
  getApi: (payload: Payload) => IamApi
  resolveActor: (req: { user?: { id?: string | number; type?: string } | null }) => {
    id?: string | number
    type?: string
  } | null
  requestHeaders: (req: { headers?: HeadersInit }) => Headers
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

export function registerAccountEndpoints(ctx: AccountEndpointCtx): Endpoint[] {
  const endpoints: Endpoint[] = []

  endpoints.push({
    path: ACCOUNT_API_PATH.changePassword,
    method: 'post',
    handler: async (req) => {
      const actor = ctx.resolveActor(req)
      if (!actor) return jsonError('Unauthorized', 401)
      let body: { currentPassword?: string; newPassword?: string }
      try {
        body = (await req.json?.()) as typeof body
      } catch {
        return jsonError('Invalid JSON', 400)
      }
      const currentPassword = body?.currentPassword?.trim() ?? ''
      const newPassword = body?.newPassword ?? ''
      if (!currentPassword || !newPassword) {
        return jsonError('currentPassword and newPassword required', 400)
      }
      try {
        await ctx.getApi(req.payload).changePassword({
          userId: String(actor.id),
          currentPassword,
          newPassword,
          headers: ctx.requestHeaders(req),
        })
        return Response.json({ ok: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Change failed'
        const status = message.includes('forbidden') || message.includes('Invalid') ? 403 : 400
        return jsonError(message, status)
      }
    },
  })

  endpoints.push({
    path: ACCOUNT_API_PATH.link.password,
    method: 'post',
    handler: async (req) => {
      const actor = ctx.resolveActor(req)
      if (!actor) return jsonError('Unauthorized', 401)
      let body: { password?: string }
      try {
        body = (await req.json?.()) as typeof body
      } catch {
        return jsonError('Invalid JSON', 400)
      }
      const password = body?.password ?? ''
      if (!isStrongPassword(password)) {
        return jsonError(passwordPolicyMessage(), 400)
      }
      try {
        await ctx.getApi(req.payload).setPassword({
          userId: String(actor.id),
          password,
        })
        return Response.json({ ok: true, method: ACCOUNT_LINK_METHOD.password })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Link failed'
        return jsonError(message, 400)
      }
    },
  })

  if (ctx.forgotPassword) {
    endpoints.push({
      path: ACCOUNT_API_PATH.link.passwordReset,
      method: 'post',
      handler: async (req) => {
        const actor = ctx.resolveActor(req)
        if (!actor) return jsonError('Unauthorized', 401)
        const userId = String(actor.id)
        const api = ctx.getApi(req.payload)
        const actorRecord = { type: 'human' as const, userId }
        try {
          await api.sendPasswordReset({ userId, actor: actorRecord })
          return Response.json({
            ok: true,
            method: ACCOUNT_LINK_METHOD.passwordReset,
            kind: 'reset' as const,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Send failed'
          if (message.includes('no credential')) {
            try {
              await api.sendSetPassword({ userId, actor: actorRecord })
              return Response.json({
                ok: true,
                method: ACCOUNT_LINK_METHOD.passwordReset,
                kind: 'set' as const,
              })
            } catch (setErr) {
              const setMessage = setErr instanceof Error ? setErr.message : 'Send failed'
              return jsonError(setMessage, 400)
            }
          }
          const status = message.includes('disabled') ? 404 : 400
          return jsonError(message, status)
        }
      },
    })
  }

  endpoints.push({
    path: ACCOUNT_API_PATH.unlink.google,
    method: 'post',
    handler: async (req) => {
      const actor = ctx.resolveActor(req)
      if (!actor) return jsonError('Unauthorized', 401)
      try {
        await ctx.getApi(req.payload).unlinkGoogleAccount({ userId: String(actor.id) })
        return Response.json({ ok: true, method: ACCOUNT_UNLINK_METHOD.google })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unlink failed'
        const status =
          message.includes('not linked') || message.includes('need password')
            ? 400
            : message.includes('last login')
              ? 400
              : message.includes('disabled')
                ? 404
                : 400
        return jsonError(message, status)
      }
    },
  })

  return endpoints
}
