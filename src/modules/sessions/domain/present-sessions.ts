import type { SessionView } from '#iam/modules/sessions/domain/session-view'
import { parseUserAgent } from './parse-user-agent'

export type RawAuthSession = {
  id: string
  token: string
  userId: string
  expiresAt: Date | string
  createdAt: Date | string
  updatedAt: Date | string
  ipAddress?: string | null
  userAgent?: string | null
}

function toIso(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

export function presentSessions(
  rows: RawAuthSession[],
  currentSessionToken: string | null
): SessionView[] {
  const now = Date.now()
  const mapped = rows
    .filter((row) => {
      const exp = new Date(row.expiresAt).getTime()
      return Number.isFinite(exp) && exp > now
    })
    .map((row) => {
      const parsed = parseUserAgent(row.userAgent)
      return {
        id: row.id,
        token: row.token,
        expiresAt: toIso(row.expiresAt),
        createdAt: toIso(row.createdAt),
        updatedAt: toIso(row.updatedAt),
        ipAddress: row.ipAddress ?? null,
        userAgent: row.userAgent ?? null,
        deviceLabel: parsed.deviceLabel,
        browserLabel: parsed.browserLabel,
        osLabel: parsed.osLabel,
        isCurrent: currentSessionToken != null && row.token === currentSessionToken,
      }
    })
  return [...mapped].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}
