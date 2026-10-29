import { describe, expect, test } from 'bun:test'
import {
  ALLOWED_TRANSITIONS,
  isLiveInvitation,
} from '../../src/modules/invitations/domain/state-machine'

describe('Gate E — invitation SM (no accepting)', () => {
  test('pending cannot go to accepting', () => {
    expect(ALLOWED_TRANSITIONS.pending.includes('accepting' as never)).toBe(false)
    expect(ALLOWED_TRANSITIONS.pending).toEqual(['accepted', 'expired', 'superseded'])
  })

  test('live invite requires pending + activeUserId === userId', () => {
    const now = new Date()
    expect(
      isLiveInvitation({
        status: 'pending',
        activeUserId: 'u1',
        userId: 'u1',
        expiresAt: new Date(now.getTime() + 60_000),
        now,
      })
    ).toBe(true)
    expect(
      isLiveInvitation({
        status: 'accepted',
        activeUserId: null,
        userId: 'u1',
        expiresAt: new Date(now.getTime() + 60_000),
        now,
      })
    ).toBe(false)
  })
})
