import { describe, expect, it } from 'vitest'
import {
  adminLoginUrl,
  buildLoginRedirectForAuthError,
  resolveLoginAuthError,
} from '../../../../src/adapters/better-auth/auth-login-errors'
import { IAM_AUTH_API_BASE_PATH } from '../../../../src/shared/paths/auth-api-path'

describe('resolveLoginAuthError', () => {
  it('maps Better Auth OAuth codes to access_denied', () => {
    expect(resolveLoginAuthError({ betterAuthError: 'signup_disabled' })).toBe('access_denied')
    expect(resolveLoginAuthError({ betterAuthError: 'unable_to_update_account' })).toBe(
      'access_denied'
    )
  })

  it('returns null when no error params', () => {
    expect(resolveLoginAuthError({})).toBeNull()
  })
})

describe('buildLoginRedirectForAuthError', () => {
  it('redirects BA error page to admin login preserving error code', () => {
    const res = buildLoginRedirectForAuthError({
      requestUrl: `http://localhost:4000${IAM_AUTH_API_BASE_PATH}/error?error=signup_disabled`,
      basePath: IAM_AUTH_API_BASE_PATH,
      baseURL: 'http://localhost:4000',
      adminRoute: '/admin',
    })
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toBe(
      'http://localhost:4000/admin/login?error=signup_disabled'
    )
  })
})

describe('adminLoginUrl', () => {
  it('joins baseURL and admin route', () => {
    expect(adminLoginUrl({ baseURL: 'http://localhost:4000/', adminRoute: '/admin' })).toBe(
      'http://localhost:4000/admin/login'
    )
  })
})
