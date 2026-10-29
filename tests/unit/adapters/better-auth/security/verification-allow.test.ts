import { describe, expect, test } from 'bun:test'
import { isBetterAuthManagedVerification } from '../../../../../src/adapters/better-auth/security/verification-allow'

describe('isBetterAuthManagedVerification', () => {
  test('allows OAuth redirect state', () => {
    expect(
      isBetterAuthManagedVerification({
        identifier: 'state-id',
        value: JSON.stringify({
          callbackURL: 'http://localhost:4000/admin',
          codeVerifier: 'cv',
          expiresAt: Date.now() + 60_000,
        }),
      })
    ).toBe(true)
  })

  test('allows Better Auth 2FA challenge rows', () => {
    expect(
      isBetterAuthManagedVerification({
        identifier: '2fa-abc123',
        value: 'user-id',
      })
    ).toBe(true)
    expect(
      isBetterAuthManagedVerification({
        identifier: '2fa-otp-abc123',
        value: 'hashed:0',
      })
    ).toBe(true)
    expect(
      isBetterAuthManagedVerification({
        identifier: '2fa-attempts-2fa-abc123',
        value: '0',
      })
    ).toBe(true)
    expect(
      isBetterAuthManagedVerification({
        identifier: 'trust-device-xyz',
        value: 'user-id',
      })
    ).toBe(true)
  })

  test('denies unknown verification payloads', () => {
    expect(
      isBetterAuthManagedVerification({
        identifier: 'reset-password:foo',
        value: 'token',
      })
    ).toBe(false)
  })
})
