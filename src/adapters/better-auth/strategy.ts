import type { AuthStrategy, AuthStrategyResult } from 'payload'
import { normalizeEmail } from '#iam/adapters/email/email'
import { BA_ADMIN_SESSION_CHANNEL } from '#iam/core/auth/ba-admin-session'
import { isRootRole } from '#iam/core/rbac/is-root-role'
import type { ServicePrincipal } from '#iam/modules/auth/services/pre-payload-service-auth'

type AuthLike = {
  api: {
    getSession: (args: { headers: Headers; query?: Record<string, boolean> }) => Promise<{
      session: { id: string; userId: string } | null
      user: { id: string; email: string; name?: string } | null
    } | null>
  }
}

export function createBetterAuthStrategy(args: {
  getAuth: () => AuthLike
  getServicePrincipal?: (
    headers: Headers
  ) => ServicePrincipal | null | Promise<ServicePrincipal | null>
}): AuthStrategy {
  return {
    name: 'better-auth',
    authenticate: async ({ payload, headers }) => {
      const hdrs = headers instanceof Headers ? headers : new Headers(headers as HeadersInit)

      if (args.getServicePrincipal) {
        const service = await args.getServicePrincipal(hdrs)
        if (service) {
          return {
            user: service as unknown as AuthStrategyResult['user'],
          }
        }
      }

      try {
        const auth = args.getAuth()
        const session = await auth.api.getSession({
          headers: hdrs,
          query: { disableRefresh: true, disableCookieCache: true },
        })
        if (!session?.user?.id) {
          return { user: null }
        }

        // find depth 0 — avoid populate findByID NotFound on stale/orphan relations
        const found = await payload.find({
          collection: 'users',
          where: { id: { equals: session.user.id } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        const user = found.docs[0] as {
          id: string
          email?: string
          fullName?: string
          isActive?: boolean
          provisioningStatus?: string
          roles?: unknown
        } | null
        if (!user || user.isActive === false) {
          return { user: null }
        }
        if (user.provisioningStatus && user.provisioningStatus !== 'none') {
          return { user: null }
        }

        // roles needed for canAccessAdmin / isRoot — load separately, never throw
        const roleIds = Array.isArray(user.roles)
          ? user.roles.flatMap((r) => {
              if (r == null) return []
              if (typeof r === 'string' || typeof r === 'number') {
                return [String(r)]
              }
              if (typeof r === 'object' && 'id' in r && r.id != null) {
                return [String((r as { id: unknown }).id)]
              }
              return []
            })
          : []
        const roles =
          roleIds.length === 0
            ? []
            : (
                await payload.find({
                  collection: 'roles',
                  where: { id: { in: roleIds } },
                  limit: roleIds.length,
                  depth: 0,
                  overrideAccess: true,
                })
              ).docs

        const baEmail = normalizeEmail(session.user.email)
        const payloadEmail = normalizeEmail(String(user.email ?? ''))
        if (baEmail !== payloadEmail) {
          return { user: null }
        }

        const iamIsRoot = roles.some((r) => isRootRole(r as { name?: string }))

        return {
          user: {
            ...user,
            roles,
            ...(iamIsRoot ? { iamIsRoot: true } : {}),
            collection: 'users',
            _strategy: 'better-auth',
            authChannel: BA_ADMIN_SESSION_CHANNEL,
            fullName: String(user.fullName ?? session.user.name ?? ''),
            email: payloadEmail,
          } as unknown as AuthStrategyResult['user'],
        }
      } catch {
        // Stale cookie / missing user / BA probe fail → anonymous. Not an app error.
        return { user: null }
      }
    },
  }
}
