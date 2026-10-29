const ACTIVE_SESSION_KEY = 'iam-invite-session'

export type StoredInviteSession = {
  invitationId: string
  token: string
  email: string
}

export function readStoredInviteSession(): StoredInviteSession | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(ACTIVE_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredInviteSession
    if (typeof parsed.invitationId !== 'string' || typeof parsed.token !== 'string') return null
    if (typeof parsed.email !== 'string' || !parsed.token || !parsed.invitationId) return null
    return parsed
  } catch {
    return null
  }
}

export function storeInviteSession(session: StoredInviteSession): void {
  try {
    sessionStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session))
  } catch {
    // sessionStorage blocked — caller keeps token in memory only
  }
}

export function clearStoredInviteSession(): void {
  try {
    sessionStorage.removeItem(ACTIVE_SESSION_KEY)
  } catch {
    // ignore
  }
}
