import type { Endpoint, Payload } from 'payload'
import { registerAccountEndpoints } from '#iam/modules/account/http/register-account-endpoints'
import { mapBootstrapErrorToHttpStatus } from '#iam/modules/bootstrap/http/map-bootstrap-error-status'
import { findInvitePostConflict } from '#iam/modules/invitations/http/evaluate-invite-post-conflict'
import {
  INVITE_API_ERROR,
  inviteApiErrorResponse,
} from '#iam/modules/invitations/http/invite-api-errors'
import {
  canAccessAdmin,
  effectiveIsRoot,
  pluginCollectionPermission,
} from '#iam/modules/rbac/access/can'
import {
  canCallerAccessTargetUser,
  loadUserForAccessCheck,
} from '#iam/modules/rbac/access/can-read-target-user'
import { assertRolesAssignable } from '#iam/modules/rbac/domain/ceiling'
import {
  canListUserSessions,
  canRevokeUserSession,
} from '#iam/modules/sessions/access/can-manage-user-sessions'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'
import type { ResolvedRbacModules } from '#iam/types/modules'
import { requireIamSurface } from './runtime/payload-iam-surface'

export function createRbacEndpoints(
  modules: ResolvedRbacModules,
  ctx: { forgotPassword: boolean; usersSlug: string }
): Endpoint[] {
  const getApi = (payload: Payload) => requireIamSurface(payload).api

  const endpoints: Endpoint[] = []

  if (modules.bootstrap) {
    endpoints.push({
      path: IAM_API_PATH.bootstrap.root,
      method: 'post',
      handler: async (req) => {
        const { isHttpBootstrapAllowed, HTTP_BOOTSTRAP_DISABLED_MESSAGE } = await import(
          '#iam/modules/bootstrap/config/bootstrap'
        )
        if (!isHttpBootstrapAllowed()) {
          return Response.json({ error: HTTP_BOOTSTRAP_DISABLED_MESSAGE }, { status: 403 })
        }
        let body: { email?: string; password?: string; fullName?: string; name?: string }
        try {
          body = (await req.json?.()) as typeof body
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        try {
          const { bootstrapRoot } = await import('#iam/modules/bootstrap/services/bootstrap-root')
          const result = await bootstrapRoot(req.payload, {
            email: body?.email ?? '',
            password: body?.password ?? '',
            fullName: body?.fullName ?? body?.name,
          })
          return Response.json(result)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Bootstrap failed'
          const status = mapBootstrapErrorToHttpStatus(message)
          // Do not surface Payload ValidationError field details to anonymous callers.
          return Response.json({ error: message }, { status })
        }
      },
    })
  }

  if (modules.invitations) {
    endpoints.push({
      path: IAM_API_PATH.invitations.invite,
      method: 'post',
      handler: async (req) => {
        const user = req.user as { id?: string | number; type?: string } | null | undefined
        if (!user?.id || user.type === 'service') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!canAccessAdmin(user as never)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        if (!pluginCollectionPermission(user as never, 'invitations', 'create')) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        let body: {
          email?: string
          fullName?: string
          name?: string
          roleIds?: string[]
          roleId?: string
        }
        try {
          body = (await req.json?.()) as typeof body
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        if (!body?.email?.trim()) {
          return Response.json({ error: 'email required' }, { status: 400 })
        }
        const fullName = body.fullName?.trim() || body.name?.trim()
        if (!fullName) {
          return Response.json({ error: 'fullName required' }, { status: 400 })
        }
        const roleIds = body.roleIds?.length ? body.roleIds : body.roleId ? [body.roleId] : []
        if (roleIds.length === 0) {
          return Response.json({ error: 'roleIds required' }, { status: 400 })
        }
        const { normalizeEmail } = await import('#iam/adapters/email/email')
        const email = normalizeEmail(body.email.trim())

        const conflict = await findInvitePostConflict(req.payload, email)
        if (conflict) return conflict.response

        {
          const roles = await req.payload.find({
            collection: 'roles',
            where: { id: { in: roleIds } },
            depth: 0,
            limit: roleIds.length,
            overrideAccess: true,
          })
          if (roles.docs.length !== roleIds.length) {
            return Response.json({ error: 'role not found' }, { status: 400 })
          }
          try {
            assertRolesAssignable(roles.docs as never, user as never)
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Forbidden'
            return Response.json({ error: message }, { status: 403 })
          }
        }
        try {
          const result = await getApi(req.payload).createSharedUser({
            email,
            fullName,
            roleIds,
            actor: { type: 'human', userId: String(user.id) },
          })
          return Response.json(result)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Invite failed'
          if (message.includes('live invitation')) {
            return inviteApiErrorResponse(INVITE_API_ERROR.LIVE_INVITATION_EXISTS, 409)
          }
          if (message.includes('already provisioned')) {
            return inviteApiErrorResponse(INVITE_API_ERROR.EMAIL_ALREADY_PROVISIONED, 409)
          }
          return Response.json({ error: message }, { status: 400 })
        }
      },
    })
    endpoints.push({
      path: IAM_API_PATH.invitations.revoke,
      method: 'post',
      handler: async (req) => {
        const user = req.user as { id?: string | number; type?: string } | null | undefined
        if (!user?.id || user.type === 'service') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!canAccessAdmin(user as never)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        if (!pluginCollectionPermission(user as never, 'invitations', 'delete')) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        let body: { invitationId?: string }
        try {
          body = (await req.json?.()) as typeof body
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        if (!body?.invitationId) {
          return Response.json({ error: 'invitationId required' }, { status: 400 })
        }
        try {
          const result = await getApi(req.payload).revokeInvitation({
            invitationId: body.invitationId,
            actor: { type: 'human', userId: String(user.id) },
          })
          return Response.json(result)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Revoke failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    })
    endpoints.push({
      path: IAM_API_PATH.invitations.resend,
      method: 'post',
      handler: async (req) => {
        const user = req.user as { id?: string | number; type?: string } | null | undefined
        if (!user?.id || user.type === 'service') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!canAccessAdmin(user as never)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        if (!pluginCollectionPermission(user as never, 'invitations', 'update')) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        let body: { invitationId?: string; sendEmail?: boolean }
        try {
          body = (await req.json?.()) as typeof body
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        if (!body?.invitationId) {
          return Response.json({ error: 'invitationId required' }, { status: 400 })
        }
        try {
          const inv = (await req.payload.findByID({
            collection: 'invitations',
            id: body.invitationId,
            depth: 0,
            overrideAccess: true,
          })) as {
            userId?: string
            email?: string
            status?: string
            authorizedRoleIds?: string[]
          } | null
          if (!inv?.email) {
            return Response.json({ error: 'Invitation not found' }, { status: 404 })
          }
          if (inv.status !== 'pending' && inv.status !== 'expired') {
            return Response.json(
              { error: 'Only pending or expired invitations can be renewed' },
              { status: 400 }
            )
          }
          // Email renew = expired only. Pending may remint silently (sendEmail: false).
          const sendEmail = body.sendEmail !== false
          if (sendEmail && inv.status !== 'expired') {
            return Response.json(
              { error: 'Only expired invitations can be renewed' },
              { status: 400 }
            )
          }
          const roleIds = Array.isArray(inv.authorizedRoleIds)
            ? inv.authorizedRoleIds.map(String)
            : []
          if (roleIds.length === 0) {
            return Response.json({ error: 'Invitation missing roles' }, { status: 400 })
          }
          {
            const roles = await req.payload.find({
              collection: 'roles',
              where: { id: { in: roleIds } },
              depth: 0,
              limit: roleIds.length,
              overrideAccess: true,
            })
            if (roles.docs.length !== roleIds.length) {
              return Response.json({ error: 'role not found' }, { status: 400 })
            }
            try {
              assertRolesAssignable(roles.docs as never, user as never)
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Forbidden'
              return Response.json({ error: message }, { status: 403 })
            }
          }
          const result = await getApi(req.payload).issueInviteReset({
            userId: inv.userId ? String(inv.userId) : undefined,
            email: String(inv.email),
            roleIds,
            actor: { type: 'human', userId: String(user.id) },
            reason: 'resend',
            sendEmail,
            invitationId: body.invitationId,
          })
          return Response.json({
            invitationId: result.invitationId,
            expiresAt: result.expiresAt,
            inviteUrl: result.inviteUrl,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Resend failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    })
  }

  if (ctx.forgotPassword && modules.users) {
    endpoints.push({
      path: IAM_API_PATH.users.requestPasswordEmail,
      method: 'post',
      handler: async (req) => {
        let body: { email?: string }
        try {
          body = (await req.json?.()) as typeof body
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        const email = body?.email?.trim()
        if (!email) {
          return Response.json({ error: 'email required' }, { status: 400 })
        }
        try {
          const result = await getApi(req.payload).requestPasswordEmail({ email })
          return Response.json(result)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Request failed'
          const status = message.includes('disabled') ? 404 : 400
          return Response.json({ error: message }, { status })
        }
      },
    })
    endpoints.push({
      path: IAM_API_PATH.users.sendPasswordReset,
      method: 'post',
      handler: async (req) => {
        const user = req.user as { id?: string | number; type?: string } | null | undefined
        if (!user?.id || user.type === 'service') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!canAccessAdmin(user as never)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        if (!pluginCollectionPermission(user as never, ctx.usersSlug, 'update')) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        let body: { userId?: string }
        try {
          body = (await req.json?.()) as typeof body
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        if (!body?.userId?.trim()) {
          return Response.json({ error: 'userId required' }, { status: 400 })
        }
        const userId = body.userId.trim()
        const target = await loadUserForAccessCheck(req, ctx.usersSlug, userId)
        if (!canCallerAccessTargetUser(user as never, target)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        const api = getApi(req.payload)
        const actor = { type: 'human' as const, userId: String(user.id) }
        try {
          await api.sendPasswordReset({ userId, actor })
          return Response.json({ ok: true, kind: 'reset' as const })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Send failed'
          if (message.includes('no credential')) {
            try {
              await api.sendSetPassword({ userId, actor })
              return Response.json({ ok: true, kind: 'set' as const })
            } catch (setErr) {
              const setMessage = setErr instanceof Error ? setErr.message : 'Send failed'
              return Response.json({ error: setMessage }, { status: 400 })
            }
          }
          const status = message.includes('not found')
            ? 400
            : message.includes('inactive') || message.includes('provisioning')
              ? 400
              : message.includes('disabled')
                ? 404
                : 400
          return Response.json({ error: message }, { status })
        }
      },
    })
  }

  if (modules.users) {
    const requestHeaders = (req: { headers?: HeadersInit; url?: string }) => {
      const headers =
        req.headers instanceof Headers ? req.headers : new Headers(req.headers as HeadersInit)
      return headers
    }

    const resolveActor = (req: { user?: { id?: string | number; type?: string } | null }) => {
      const user = req.user
      if (!user?.id || user.type === 'service') return null
      if (!canAccessAdmin(user as never)) return null
      return user
    }

    endpoints.push({
      path: IAM_API_PATH.sessions.list,
      method: 'get',
      handler: async (req) => {
        const actor = resolveActor(req)
        if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        const targetUserId = String(actor.id)
        if (
          !canListUserSessions({
            actor: actor as never,
            targetUserId,
            usersCollectionSlug: ctx.usersSlug,
          })
        ) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        try {
          const sessions = await getApi(req.payload).listUserSessions({
            targetUserId,
            headers: requestHeaders(req),
          })
          return Response.json({ sessions })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'List failed'
          return Response.json({ error: message }, { status: 500 })
        }
      },
    })

    endpoints.push({
      path: IAM_API_PATH.users.sessions,
      method: 'get',
      handler: async (req) => {
        const actor = resolveActor(req)
        if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        let userId = ''
        try {
          const url = new URL(req.url ?? 'http://payload.invalid/', 'http://payload.invalid')
          userId = url.searchParams.get('userId')?.trim() ?? ''
        } catch {
          userId = ''
        }
        if (!userId) {
          return Response.json({ error: 'userId required' }, { status: 400 })
        }
        const target =
          String(actor.id) === userId
            ? undefined
            : await loadUserForAccessCheck(req, ctx.usersSlug, userId)
        if (
          !canListUserSessions({
            actor: actor as never,
            targetUserId: userId,
            usersCollectionSlug: ctx.usersSlug,
            ...(String(actor.id) === userId ? {} : { target }),
          })
        ) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        try {
          const sessions = await getApi(req.payload).listUserSessions({
            targetUserId: userId,
            headers: requestHeaders(req),
          })
          return Response.json({ sessions })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'List failed'
          return Response.json({ error: message }, { status: 500 })
        }
      },
    })

    endpoints.push({
      path: IAM_API_PATH.sessions.revoke,
      method: 'post',
      handler: async (req) => {
        const actor = resolveActor(req)
        if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 })
        let body: { token?: string; userId?: string }
        try {
          body = (await req.json?.()) as typeof body
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        const token = body?.token?.trim()
        if (!token) {
          return Response.json({ error: 'token required' }, { status: 400 })
        }
        const targetUserId = body?.userId?.trim() || String(actor.id)
        const target =
          String(actor.id) === targetUserId
            ? undefined
            : await loadUserForAccessCheck(req, ctx.usersSlug, targetUserId)
        if (
          !canRevokeUserSession({
            actor: actor as never,
            targetUserId,
            usersCollectionSlug: ctx.usersSlug,
            ...(String(actor.id) === targetUserId ? {} : { target }),
          })
        ) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        try {
          await getApi(req.payload).revokeUserSession({ targetUserId, token })
          return Response.json({ ok: true })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Revoke failed'
          const status = message.includes('not found') ? 404 : 400
          return Response.json({ error: message }, { status })
        }
      },
    })

    endpoints.push({
      path: IAM_API_PATH.users.transferRoot,
      method: 'post',
      handler: async (req) => {
        const actorUser = req.user as {
          id?: string | number
          type?: string
          roles?: unknown
        } | null
        if (!actorUser?.id || actorUser.type === 'service') {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        if (!effectiveIsRoot(actorUser as never)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }
        let body: { userId?: string }
        try {
          body = (await req.json?.()) as typeof body
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }
        const targetUserId = body?.userId?.trim()
        if (!targetUserId) {
          return Response.json({ error: 'userId required' }, { status: 400 })
        }
        if (String(actorUser.id) === targetUserId) {
          return Response.json({ error: 'Cannot transfer Root to yourself' }, { status: 400 })
        }
        try {
          await getApi(req.payload).transferRoot({
            targetUserId,
            actor: { type: 'human', userId: String(actorUser.id) },
          })
          return Response.json({ ok: true })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Transfer failed'
          const status =
            message.includes('Only Root') || message.includes('Forbidden')
              ? 403
              : message.includes('not found')
                ? 404
                : 400
          return Response.json({ error: message }, { status })
        }
      },
    })

    endpoints.push(
      ...registerAccountEndpoints({
        forgotPassword: ctx.forgotPassword,
        getApi,
        resolveActor,
        requestHeaders,
      })
    )
  }

  return endpoints
}
