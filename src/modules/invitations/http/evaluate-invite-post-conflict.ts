import type { Payload } from 'payload'
import { INVITE_API_ERROR, inviteApiErrorResponse } from './invite-api-errors'

export type InvitePostConflictBlocked = {
  response: Response
}

export type ExistingInviteUserRow = {
  id: string
  provisioningStatus?: string
  isActive?: boolean
}

export type InvitePostConflictInput = {
  hasLivePendingByEmail: boolean
  expiredInvitationId?: string | null
  existingUser?: ExistingInviteUserRow | null
  hasLivePendingForAnchorUser: boolean
}

/** Pure evaluation: pending → expired → provisioned (anchor pending). */
export function evaluateInvitePostConflict(
  input: InvitePostConflictInput
): InvitePostConflictBlocked | null {
  if (input.hasLivePendingByEmail) {
    return {
      response: inviteApiErrorResponse(INVITE_API_ERROR.LIVE_INVITATION_EXISTS, 409),
    }
  }

  const expiredId = input.expiredInvitationId?.trim()
  if (expiredId) {
    return {
      response: inviteApiErrorResponse(INVITE_API_ERROR.EXPIRED_INVITATION_EXISTS, 409, {
        invitationId: expiredId,
      }),
    }
  }

  const row = input.existingUser
  if (row) {
    const isInviteAnchor = row.provisioningStatus === 'provisioning' && row.isActive === false
    if (!isInviteAnchor) {
      return {
        response: inviteApiErrorResponse(INVITE_API_ERROR.EMAIL_ALREADY_PROVISIONED, 409),
      }
    }
    if (input.hasLivePendingForAnchorUser) {
      return {
        response: inviteApiErrorResponse(INVITE_API_ERROR.LIVE_INVITATION_EXISTS, 409),
      }
    }
    // Orphaned provisioning anchor (no pending invite) — allow invite to resume/reissue.
    return null
  }

  return null
}

/** Loads invite POST conflict from Payload (same queries as invite POST). */
export async function findInvitePostConflict(
  payload: Payload,
  email: string
): Promise<InvitePostConflictBlocked | null> {
  const liveInvite = await payload.find({
    collection: 'invitations',
    where: {
      and: [{ email: { equals: email } }, { status: { equals: 'pending' } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const expiredInvite = await payload.find({
    collection: 'invitations',
    where: {
      and: [{ email: { equals: email } }, { status: { equals: 'expired' } }],
    },
    sort: '-updatedAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const existingUser = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  let hasLivePendingForAnchorUser = false
  const userDoc = existingUser.docs[0] as ExistingInviteUserRow | undefined
  if (userDoc?.id) {
    const pendingForUser = await payload.find({
      collection: 'invitations',
      where: {
        and: [{ userId: { equals: String(userDoc.id) } }, { status: { equals: 'pending' } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    hasLivePendingForAnchorUser = pendingForUser.docs.length > 0
  }

  return evaluateInvitePostConflict({
    hasLivePendingByEmail: liveInvite.docs.length > 0,
    expiredInvitationId: expiredInvite.docs.length > 0 ? String(expiredInvite.docs[0]!.id) : null,
    existingUser: userDoc ?? null,
    hasLivePendingForAnchorUser,
  })
}
