import { describe, expect, test } from 'bun:test'
import {
  INVITE_API_ERROR,
  inviteApiErrorResponse,
} from '../../../../src/modules/invitations/http/invite-api-errors'

describe('invite API errors', () => {
  test('response includes stable code for i18n', async () => {
    const res = inviteApiErrorResponse(INVITE_API_ERROR.LIVE_INVITATION_EXISTS, 409)
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error?: string; code?: string }
    expect(body.code).toBe('live_invitation_exists')
    expect(body.error).toBe('live_invitation_exists')
  })

  test('expired invitation may include invitationId', async () => {
    const res = inviteApiErrorResponse(INVITE_API_ERROR.EXPIRED_INVITATION_EXISTS, 409, {
      invitationId: 'inv-1',
    })
    const body = (await res.json()) as { invitationId?: string; code?: string }
    expect(body.code).toBe('expired_invitation_exists')
    expect(body.invitationId).toBe('inv-1')
  })
})
