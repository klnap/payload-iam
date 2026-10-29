export type SessionView = {
  id: string
  /** Session token — required for revoke; only returned to authorized callers. */
  token: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  ipAddress: string | null
  userAgent: string | null
  deviceLabel: string
  browserLabel: string
  osLabel: string
  isCurrent: boolean
}
