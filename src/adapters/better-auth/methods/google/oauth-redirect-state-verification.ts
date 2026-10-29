/** Better Auth OAuth redirect state (`storeStateStrategy: database`). */
export function isOAuthRedirectStateVerification(data: Record<string, unknown>): boolean {
  if (data.invitationId != null) return false
  const raw = data.value
  if (typeof raw !== 'string') return false
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return (
      typeof parsed.callbackURL === 'string' &&
      typeof parsed.codeVerifier === 'string' &&
      typeof parsed.expiresAt === 'number'
    )
  } catch {
    return false
  }
}
