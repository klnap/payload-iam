import { describe, expect, test } from 'bun:test'
import { isAuthRouteAllowed } from '../../src/adapters/better-auth/security/http-allowlist'
import { IAM_AUTH_ROUTE_RULES_ALL, IAM_AUTH_ROUTES } from '../../src/shared/paths/auth-routes'

describe('Gate E — HTTP allowlist', () => {
  test('METHOD+PATH exact — GET /sign-in/email denied', () => {
    expect(isAuthRouteAllowed('GET', '/sign-in/email')).toBe(false)
  })

  test('allowlist has no wildcard paths', () => {
    for (const r of IAM_AUTH_ROUTE_RULES_ALL) {
      expect(r.path.includes('*')).toBe(false)
      expect(r.path.startsWith('/')).toBe(true)
    }
  })

  test('invite accept only POST', () => {
    expect(isAuthRouteAllowed('POST', IAM_AUTH_ROUTES.invitations.accept)).toBe(true)
    expect(isAuthRouteAllowed('GET', IAM_AUTH_ROUTES.invitations.accept)).toBe(false)
  })

  test('google invite bind only POST', () => {
    expect(isAuthRouteAllowed('POST', IAM_AUTH_ROUTES.google.inviteBind)).toBe(true)
    expect(isAuthRouteAllowed('GET', IAM_AUTH_ROUTES.google.inviteBind)).toBe(false)
  })
})
