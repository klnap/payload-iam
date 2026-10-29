export const INVITATION_STATUSES = ['pending', 'accepted', 'expired', 'superseded'] as const

export type InvitationStatus = (typeof INVITATION_STATUSES)[number]

export const TERMINAL_REASONS = [
  'natural-expiry',
  'resend',
  'revoke',
  'send-failure',
  'user-deleted',
  'repair',
] as const

export type TerminalReason = (typeof TERMINAL_REASONS)[number]

/** Frozen — no accepting state (Model B). */
export const ALLOWED_TRANSITIONS: Record<InvitationStatus, readonly InvitationStatus[]> = {
  pending: ['accepted', 'expired', 'superseded'],
  accepted: [],
  // Renew revive — same row, new token / TTL
  expired: ['pending'],
  superseded: [],
}

export function assertTransition(from: InvitationStatus, to: InvitationStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`forbidden invitation transition: ${from} → ${to}`)
  }
}

export function isNonTerminal(status: InvitationStatus): boolean {
  return status === 'pending'
}

export function isLiveInvitation(args: {
  status: InvitationStatus
  activeUserId?: string | null | undefined
  userId?: string | null | undefined
  expiresAt: Date
  now: Date
}): boolean {
  if (args.userId != null && args.activeUserId != null) {
    if (args.activeUserId !== args.userId) return false
  }
  return isNonTerminal(args.status) && args.expiresAt.getTime() > args.now.getTime()
}

export function isGoogleFirstLinkAllowed(args: {
  status: InvitationStatus
  activeUserId?: string | null | undefined
  userId?: string | null | undefined
  expiresAt: Date
  now: Date
}): boolean {
  if (args.userId != null && args.activeUserId != null) {
    if (args.activeUserId !== args.userId) return false
  }
  return args.status === 'pending' && args.expiresAt.getTime() > args.now.getTime()
}
