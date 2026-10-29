import { describe, expect, test } from 'bun:test'
import {
  parseInviteGoogleCookie,
  serializeInviteGoogleCookie,
} from '../../../../../../src/adapters/better-auth/methods/google/invite-google-cookie'

describe('invite google cookie', () => {
  const secret = 'test-secret'

  test('round-trips signed payload', () => {
    const payload = {
      invitationId: 'inv-1',
      userId: 'user-1',
      token: 'tok',
      email: 'a@b.com',
      provisioningOperationId: 'op-1',
      exp: Date.now() + 60_000,
    }
    const raw = serializeInviteGoogleCookie(secret, payload)
    expect(parseInviteGoogleCookie(secret, raw)).toEqual(payload)
  })

  test('rejects tampered signature', () => {
    const payload = {
      invitationId: 'inv-1',
      userId: 'user-1',
      token: 'tok',
      email: 'a@b.com',
      provisioningOperationId: 'op-1',
      exp: Date.now() + 60_000,
    }
    const raw = serializeInviteGoogleCookie(secret, payload)
    const tampered = `${raw}x`
    expect(parseInviteGoogleCookie(secret, tampered)).toBeNull()
  })

  test('rejects expired payload', () => {
    const payload = {
      invitationId: 'inv-1',
      userId: 'user-1',
      token: 'tok',
      email: 'a@b.com',
      provisioningOperationId: 'op-1',
      exp: Date.now() - 1,
    }
    const raw = serializeInviteGoogleCookie(secret, payload)
    expect(parseInviteGoogleCookie(secret, raw)).toBeNull()
  })
})
