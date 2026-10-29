import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  clearStoredInviteSession,
  readStoredInviteSession,
  storeInviteSession,
} from '../../../../src/modules/invitations/ui/hooks/invite-accept-token-storage'

function mockSessionStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
  } as Storage
}

describe('invite accept sessionStorage', () => {
  beforeEach(() => {
    ;(globalThis as { sessionStorage?: Storage }).sessionStorage = mockSessionStorage()
  })

  afterEach(() => {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage
  })

  test('store and read round-trip', () => {
    storeInviteSession({
      invitationId: 'inv-1',
      token: 'tok-secret',
      email: 'a@example.com',
    })
    expect(readStoredInviteSession()).toEqual({
      invitationId: 'inv-1',
      token: 'tok-secret',
      email: 'a@example.com',
    })
  })

  test('clear removes session', () => {
    storeInviteSession({
      invitationId: 'inv-1',
      token: 't',
      email: 'a@example.com',
    })
    clearStoredInviteSession()
    expect(readStoredInviteSession()).toBeNull()
  })

  test('rejects malformed JSON', () => {
    sessionStorage.setItem('iam-invite-session', '{not-json')
    expect(readStoredInviteSession()).toBeNull()
  })

  test('rejects missing token or invitationId', () => {
    sessionStorage.setItem(
      'iam-invite-session',
      JSON.stringify({ token: '', invitationId: 'x', email: '' })
    )
    expect(readStoredInviteSession()).toBeNull()
  })
})
