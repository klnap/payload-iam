import { describe, expect, test } from 'bun:test'
import { isOAuthRedirectStateVerification } from '../../../../../../src/adapters/better-auth/methods/google/oauth-redirect-state-verification'

describe('isOAuthRedirectStateVerification', () => {
  test('allows OAuth redirect payload without invitationId', () => {
    expect(
      isOAuthRedirectStateVerification({
        identifier: 'state-id',
        value: JSON.stringify({
          callbackURL: 'http://localhost:4000/admin',
          codeVerifier: 'cv',
          expiresAt: Date.now() + 60_000,
        }),
      })
    ).toBe(true)
  })

  test('denies invite-bound or malformed payloads', () => {
    expect(
      isOAuthRedirectStateVerification({
        identifier: 'x',
        value: JSON.stringify({ callbackURL: 'http://x' }),
        invitationId: 'inv-1',
      })
    ).toBe(false)
    expect(
      isOAuthRedirectStateVerification({
        identifier: 'x',
        value: 'not-json',
      })
    ).toBe(false)
  })
})
