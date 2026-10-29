import { describe, expect, test } from 'bun:test'
import { IAM_AUTH_API_BASE_PATH, iamAuthApiUrl } from '../../../../src/shared/paths/auth-api-path'

describe('auth-api-path', () => {
  test('IAM_AUTH_API_BASE_PATH is under /api/iam', () => {
    expect(IAM_AUTH_API_BASE_PATH).toBe('/api/iam/auth')
  })

  test('iamAuthApiUrl joins relative paths', () => {
    expect(iamAuthApiUrl('/sign-out')).toBe('/api/iam/auth/sign-out')
    expect(iamAuthApiUrl('sign-in/email')).toBe('/api/iam/auth/sign-in/email')
  })
})
