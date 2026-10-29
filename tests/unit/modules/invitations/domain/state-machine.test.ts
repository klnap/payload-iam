import { describe, expect, test } from 'bun:test'
import {
  ALLOWED_TRANSITIONS,
  assertTransition,
  isGoogleFirstLinkAllowed,
  isLiveInvitation,
  isNonTerminal,
} from '../../../../../src/modules/invitations/domain/state-machine'

describe('invitation transitions', () => {
  test('pending may accept / expire / supersede only', () => {
    expect([...ALLOWED_TRANSITIONS.pending].sort()).toEqual(['accepted', 'expired', 'superseded'])
    expect(() => assertTransition('pending', 'accepted')).not.toThrow()
    expect(() => assertTransition('pending', 'pending')).toThrow(/forbidden invitation transition/)
  })

  test('accepted and superseded are terminal; expired may renew to pending', () => {
    expect(ALLOWED_TRANSITIONS.accepted).toEqual([])
    expect(ALLOWED_TRANSITIONS.superseded).toEqual([])
    expect([...ALLOWED_TRANSITIONS.expired]).toEqual(['pending'])
    expect(() => assertTransition('expired', 'pending')).not.toThrow()
    expect(() => assertTransition('accepted', 'pending')).toThrow()
  })

  test('isNonTerminal only pending', () => {
    expect(isNonTerminal('pending')).toBe(true)
    expect(isNonTerminal('expired')).toBe(false)
    expect(isNonTerminal('accepted')).toBe(false)
  })
})

describe('isLiveInvitation', () => {
  const now = new Date('2026-09-28T12:00:00Z')
  const future = new Date('2026-09-29T12:00:00Z')
  const past = new Date('2026-09-27T12:00:00Z')

  test('live = pending + activeUserId match + not expired', () => {
    expect(
      isLiveInvitation({
        status: 'pending',
        activeUserId: 'u1',
        userId: 'u1',
        expiresAt: future,
        now,
      })
    ).toBe(true)
  })

  test('not live when expired clock / wrong active / wrong status', () => {
    expect(
      isLiveInvitation({
        status: 'pending',
        activeUserId: 'u1',
        userId: 'u1',
        expiresAt: past,
        now,
      })
    ).toBe(false)
    expect(
      isLiveInvitation({
        status: 'pending',
        activeUserId: 'other',
        userId: 'u1',
        expiresAt: future,
        now,
      })
    ).toBe(false)
    expect(
      isLiveInvitation({
        status: 'expired',
        activeUserId: 'u1',
        userId: 'u1',
        expiresAt: future,
        now,
      })
    ).toBe(false)
  })
})

describe('isGoogleFirstLinkAllowed', () => {
  const now = new Date('2026-09-28T12:00:00Z')
  const future = new Date('2026-09-29T12:00:00Z')

  test('same gate as live pending invite', () => {
    expect(
      isGoogleFirstLinkAllowed({
        status: 'pending',
        activeUserId: 'u1',
        userId: 'u1',
        expiresAt: future,
        now,
      })
    ).toBe(true)
    expect(
      isGoogleFirstLinkAllowed({
        status: 'accepted',
        activeUserId: 'u1',
        userId: 'u1',
        expiresAt: future,
        now,
      })
    ).toBe(false)
  })
})
