/** Stable API error codes for invite drawer i18n (`iam:rbac:invite*`). */
export const INVITE_API_ERROR = {
  LIVE_INVITATION_EXISTS: 'live_invitation_exists',
  EXPIRED_INVITATION_EXISTS: 'expired_invitation_exists',
  EMAIL_ALREADY_PROVISIONED: 'email_already_provisioned',
} as const

export type InviteApiErrorCode = (typeof INVITE_API_ERROR)[keyof typeof INVITE_API_ERROR]

export function inviteApiErrorResponse(code: InviteApiErrorCode, status: number, extra?: object) {
  return Response.json({ error: code, code, ...extra }, { status })
}
