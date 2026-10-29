import type { BetterAuthPlugin } from 'better-auth'
import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api'
import { normalizeEmail } from '#iam/adapters/email/email'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import type { HostRuntimeDeps } from '#iam/types/config'

const INVALID_CREDS = {
  code: 'INVALID_EMAIL_OR_PASSWORD',
  message: 'Invalid email or password',
} as const

/** Session DTO + inactive sign-in gate (WARN, not BA ERROR "Failed to create session"). */
export function sessionDtoPlugin(host: HostRuntimeDeps): BetterAuthPlugin {
  return {
    id: 'payload-iam-session-dto',
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === '/sign-in/email' || ctx.path === '/sign-in/email/',
          handler: createAuthMiddleware(async (ctx) => {
            const email = (ctx.body as { email?: unknown } | undefined)?.email
            if (typeof email !== 'string' || !email.trim()) return
            try {
              const payload = await hostPayload(host)
              const found = await payload.find({
                collection: 'users',
                where: { email: { equals: normalizeEmail(email) } },
                limit: 1,
                depth: 0,
                overrideAccess: true,
              })
              const user = found.docs[0] as { isActive?: boolean } | undefined
              if (user && user.isActive === false) {
                // Same severity as BA "Invalid password"
                ctx.context.logger.warn('Inactive user')
                throw APIError.from('UNAUTHORIZED', INVALID_CREDS)
              }
            } catch (err) {
              if (isAPIError(err)) throw err
              // infra — let sign-in continue; session hook still gates
            }
          }),
        },
      ],
      after: [
        {
          matcher: (ctx) => ctx.path === '/get-session' || ctx.path === '/get-session/',
          handler: createAuthMiddleware(async (ctx) => {
            // BA stores endpoint result on ctx.context.returned
            const returned = (ctx.context as { returned?: unknown }).returned as
              | {
                  session?: unknown
                  user?: { id: string; email?: string; name?: string }
                }
              | null
              | undefined
            if (!returned?.user?.id) return
            try {
              const payload = await hostPayload(host)
              // find — findByID throws NotFound on stale BA cookie / deleted user
              const found = await payload.find({
                collection: 'users',
                where: { id: { equals: returned.user.id } },
                limit: 1,
                depth: 0,
                overrideAccess: true,
              })
              const user = found.docs[0] as { fullName?: string; email?: string } | undefined
              if (!user) return
              returned.user.name = String(user.fullName ?? '')
              returned.user.email = normalizeEmail(String(user.email ?? ''))
            } catch {
              // infra error — do not fake logout; leave BA fields
            }
          }),
        },
      ],
    },
  }
}
