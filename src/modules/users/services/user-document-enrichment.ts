import type { PayloadRequest } from 'payload'
import type { SessionView } from '#iam/modules/sessions/domain/session-view'
import type { UserAuthAccountInsights } from '#iam/modules/users/domain/user-auth-account-insights'
import { readIamSurface } from '#iam/plugin/runtime/payload-iam-surface'

export type { UserAuthAccountInsights } from '#iam/modules/users/domain/user-auth-account-insights'

type AuthAccountsReader = {
  $context: Promise<{
    internalAdapter: {
      findAccounts: (userId: string) => Promise<Array<{ providerId?: string }>>
    }
  }>
}

function isSingleUserDocumentRead(req: PayloadRequest, usersSlug: string): boolean {
  if (req.query?.limit != null) return false
  const raw = req.url
  if (raw) {
    try {
      const path = new URL(raw, 'http://payload.local').pathname
      if (path.startsWith('/api/')) {
        const segments = path.split('/').filter(Boolean)
        if (segments.length === 3 && segments[1] === usersSlug) {
          const id = segments[2]
          return id != null && id.length > 0 && id !== 'access'
        }
      }
    } catch {
      // fall through
    }
  }
  const routeId = (req as { routeParams?: { id?: string } }).routeParams?.id
  return typeof routeId === 'string' && routeId.length > 0
}

export function shouldEnrichUserAdminDocument(req: PayloadRequest, usersSlug: string): boolean {
  return isSingleUserDocumentRead(req, usersSlug)
}

export async function loadUserAuthAccountInsights(args: {
  payload: PayloadRequest['payload']
  userId: string
  googleLoginEnabled: boolean
  getAuth: () => AuthAccountsReader
}): Promise<UserAuthAccountInsights> {
  const surface = readIamSurface(args.payload)
  let hasPassword = false
  let hasGoogle = false

  if (surface) {
    hasPassword = await surface.api.userHasPasswordLogin({ userId: args.userId })
    const auth = args.getAuth()
    const ctx = await auth.$context
    const accounts = await ctx.internalAdapter.findAccounts(args.userId)
    hasGoogle = accounts.some((row) => row.providerId === 'google')
  }

  let lastLoginAt: string | null = null
  if (surface) {
    try {
      const sessions = await surface.api.listUserSessions({
        targetUserId: args.userId,
        headers: new Headers(),
      })
      for (const row of sessions) {
        const candidate = row.updatedAt || row.createdAt
        if (!candidate) continue
        if (!lastLoginAt || candidate > lastLoginAt) lastLoginAt = candidate
      }
    } catch {
      lastLoginAt = null
    }
  }

  return {
    hasPassword,
    hasGoogle,
    googleLoginEnabled: args.googleLoginEnabled,
    lastLoginAt,
  }
}

export async function loadAdminUserSessions(args: {
  payload: PayloadRequest['payload']
  userId: string
  headers: Headers
}): Promise<SessionView[]> {
  const surface = readIamSurface(args.payload)
  if (!surface) return []
  return surface.api.listUserSessions({
    targetUserId: args.userId,
    headers: args.headers,
  })
}
