import { describe, expect, it } from 'vitest'
import {
  allowAccountUpdateDuringOAuth,
  allowUserEmailVerifiedDuringOAuth,
  looksLikeOAuthAccountPatch,
} from '../../../../../../src/adapters/better-auth/methods/google/oauth-callback-context'

describe('allowAccountUpdateDuringOAuth', () => {
  const ctx = { path: '/callback/google' }

  it('allows token refresh on OAuth callback', () => {
    expect(
      allowAccountUpdateDuringOAuth(
        {
          providerId: 'google',
          accessToken: 'enc',
          refreshToken: 'enc',
          updatedAt: new Date(),
        },
        ctx
      )
    ).toBe(true)
  })

  it('denies identity changes even on callback', () => {
    expect(allowAccountUpdateDuringOAuth({ userId: 'x' }, ctx)).toBe(false)
  })

  it('denies profile-like fields on callback', () => {
    expect(
      allowAccountUpdateDuringOAuth({ providerId: 'google', accessToken: 'x', name: 'Eve' }, ctx)
    ).toBe(false)
  })

  it('denies off-callback maintenance', () => {
    expect(allowAccountUpdateDuringOAuth({ accessToken: 'a' }, { path: '/sign-in/email' })).toBe(
      false
    )
  })
})

describe('looksLikeOAuthAccountPatch', () => {
  it('matches BA sign-in token refresh shape', () => {
    expect(
      looksLikeOAuthAccountPatch({
        providerId: 'google',
        accessToken: 'x',
        idToken: 'y',
      })
    ).toBe(true)
  })
})

describe('allowUserEmailVerifiedDuringOAuth', () => {
  it('allows emailVerified bump during callback', () => {
    expect(
      allowUserEmailVerifiedDuringOAuth({ emailVerified: true }, { path: '/callback/google' })
    ).toBe(true)
  })
})
