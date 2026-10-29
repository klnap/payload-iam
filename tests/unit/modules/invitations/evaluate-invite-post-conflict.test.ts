import { describe, expect, test } from 'bun:test'
import {
  evaluateInvitePostConflict,
  type InvitePostConflictInput,
} from '../../../../src/modules/invitations/http/evaluate-invite-post-conflict'
import { INVITE_API_ERROR } from '../../../../src/modules/invitations/http/invite-api-errors'

async function conflictCode(input: InvitePostConflictInput): Promise<string | null> {
  const blocked = evaluateInvitePostConflict(input)
  if (!blocked) return null
  const body = (await blocked.response.json()) as { code?: string }
  return body.code ?? null
}

describe('evaluateInvitePostConflict order (pending → expired → provisioned)', () => {
  test('live pending by email wins over expired and user', async () => {
    expect(
      await conflictCode({
        hasLivePendingByEmail: true,
        expiredInvitationId: 'exp-1',
        existingUser: { id: 'u1', provisioningStatus: 'none', isActive: true },
        hasLivePendingForAnchorUser: false,
      })
    ).toBe(INVITE_API_ERROR.LIVE_INVITATION_EXISTS)
  })

  test('expired invitation when no live pending', async () => {
    const blocked = evaluateInvitePostConflict({
      hasLivePendingByEmail: false,
      expiredInvitationId: 'exp-9',
      existingUser: null,
      hasLivePendingForAnchorUser: false,
    })
    expect(blocked).not.toBeNull()
    const body = (await blocked!.response.json()) as { code?: string; invitationId?: string }
    expect(body.code).toBe(INVITE_API_ERROR.EXPIRED_INVITATION_EXISTS)
    expect(body.invitationId).toBe('exp-9')
  })

  test('active user blocks before anchor checks', async () => {
    expect(
      await conflictCode({
        hasLivePendingByEmail: false,
        expiredInvitationId: null,
        existingUser: { id: 'u1', provisioningStatus: 'none', isActive: true },
        hasLivePendingForAnchorUser: false,
      })
    ).toBe(INVITE_API_ERROR.EMAIL_ALREADY_PROVISIONED)
  })

  test('provisioned anchor with pending invite → live exists', async () => {
    expect(
      await conflictCode({
        hasLivePendingByEmail: false,
        expiredInvitationId: null,
        existingUser: { id: 'u1', provisioningStatus: 'provisioning', isActive: false },
        hasLivePendingForAnchorUser: true,
      })
    ).toBe(INVITE_API_ERROR.LIVE_INVITATION_EXISTS)
  })

  test('provisioned anchor without pending invite → allow re-invite', async () => {
    expect(
      await conflictCode({
        hasLivePendingByEmail: false,
        expiredInvitationId: null,
        existingUser: { id: 'u1', provisioningStatus: 'provisioning', isActive: false },
        hasLivePendingForAnchorUser: false,
      })
    ).toBeNull()
  })

  test('no conflict when email is free', () => {
    expect(
      evaluateInvitePostConflict({
        hasLivePendingByEmail: false,
        expiredInvitationId: null,
        existingUser: null,
        hasLivePendingForAnchorUser: false,
      })
    ).toBeNull()
  })
})
