import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { presentSessions, type RawAuthSession } from '#iam/modules/sessions/domain/present-sessions'
import type { SessionView } from '#iam/modules/sessions/domain/session-view'

type AuthLike = {
  api: {
    getSession: (args: { headers: Headers; query?: Record<string, boolean | string> }) => Promise<{
      session: { token?: string; id?: string } | null
      user: { id: string } | null
    } | null>
  }
  $context: Promise<{
    internalAdapter: {
      listSessions: (
        userId: string,
        options?: { onlyActiveSessions?: boolean }
      ) => Promise<RawAuthSession[]>
      findSession: (token: string) => Promise<{ session: RawAuthSession } | null>
      deleteSession: (token: string) => Promise<void>
    }
  }>
}

export function createSessionsService(auth: AuthLike) {
  return {
    async resolveCurrentSessionToken(headers: Headers): Promise<string | null> {
      const result = await auth.api.getSession({
        headers,
        query: { disableRefresh: true, disableCookieCache: true },
      })
      const token = result?.session?.token
      return typeof token === 'string' && token.length > 0 ? token : null
    },

    async listSessionsForUser(args: {
      targetUserId: string
      currentSessionToken: string | null
    }): Promise<SessionView[]> {
      const { targetUserId, currentSessionToken } = args
      return runWithInternalOperation({ kind: 'GENERIC_RESET', userId: targetUserId }, async () => {
        const ctx = await auth.$context
        const rows = await ctx.internalAdapter.listSessions(targetUserId, {
          onlyActiveSessions: true,
        })
        return presentSessions(rows as RawAuthSession[], currentSessionToken)
      })
    },

    async revokeSessionForUser(args: { targetUserId: string; token: string }): Promise<void> {
      const { targetUserId, token } = args
      await runWithInternalOperation({ kind: 'GENERIC_RESET', userId: targetUserId }, async () => {
        const ctx = await auth.$context
        const found = await ctx.internalAdapter.findSession(token)
        if (!found?.session || String(found.session.userId) !== targetUserId) {
          throw new Error('Session not found')
        }
        await ctx.internalAdapter.deleteSession(token)
      })
    },

    async revokeAllSessionsForUser(targetUserId: string): Promise<void> {
      await runWithInternalOperation({ kind: 'GENERIC_RESET', userId: targetUserId }, async () => {
        const ctx = await auth.$context
        const rows = await ctx.internalAdapter.listSessions(targetUserId, {
          onlyActiveSessions: true,
        })
        for (const row of rows) {
          const token = (row as RawAuthSession).token
          if (typeof token === 'string' && token.length > 0) {
            await ctx.internalAdapter.deleteSession(token)
          }
        }
      })
    },
  }
}

export type SessionsService = ReturnType<typeof createSessionsService>
