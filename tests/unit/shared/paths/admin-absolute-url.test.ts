import { describe, expect, test } from 'bun:test'
import {
  adminAbsolutePath,
  adminAbsoluteUrl,
} from '../../../../src/shared/paths/admin-absolute-url'
import { buildLoginOtpSignInUrl } from '../../../../src/shared/paths/login-otp-email-link'

describe('adminAbsoluteUrl', () => {
  test('default admin prefix', () => {
    expect(adminAbsoluteUrl('http://localhost:4000', '/admin', '/login')).toBe(
      'http://localhost:4000/admin/login'
    )
  })

  test('admin at site root', () => {
    expect(adminAbsoluteUrl('http://localhost:4000', '/', '/login')).toBe(
      'http://localhost:4000/login'
    )
    expect(adminAbsolutePath('/', '/invite/accept')).toBe('/invite/accept')
  })

  test('custom admin segment', () => {
    expect(adminAbsoluteUrl('https://cms.test', '/studio', '/reset-password')).toBe(
      'https://cms.test/studio/reset-password'
    )
  })
})

describe('buildLoginOtpSignInUrl', () => {
  test('respects routes.admin when admin is root', () => {
    const url = buildLoginOtpSignInUrl({
      serverURL: 'http://localhost:4000',
      adminRoute: '/',
      otp: '123456',
    })
    expect(url).toBe('http://localhost:4000/login?otp=123456')
  })
})
