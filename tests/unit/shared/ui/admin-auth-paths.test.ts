import { describe, expect, test } from 'bun:test'
import {
  isLoginAdminPath,
  isPublicAdminAuthPath,
} from '../../../../src/shared/paths/admin-auth-paths'

describe('isPublicAdminAuthPath', () => {
  test('login and OAuth return paths are public', () => {
    expect(isPublicAdminAuthPath('/admin/login', '/admin')).toBe(true)
    expect(isPublicAdminAuthPath('/admin/reset-password', '/admin')).toBe(true)
    expect(isPublicAdminAuthPath('/admin/invite/accept', '/admin')).toBe(true)
  })

  test('dashboard paths require session', () => {
    expect(isPublicAdminAuthPath('/admin', '/admin')).toBe(false)
    expect(isPublicAdminAuthPath('/admin/collections/users', '/admin')).toBe(false)
  })

  test('login path when admin is mounted at site root', () => {
    expect(isLoginAdminPath('/login', '/')).toBe(true)
    expect(isLoginAdminPath('/', '/')).toBe(false)
    expect(isPublicAdminAuthPath('/login', '/')).toBe(true)
    expect(isPublicAdminAuthPath('/sign-out', '/')).toBe(true)
    expect(isPublicAdminAuthPath('/session-ended', '/')).toBe(true)
    expect(isPublicAdminAuthPath('/logout', '/')).toBe(false)
    expect(isPublicAdminAuthPath('/logout-inactivity', '/')).toBe(false)
    expect(isPublicAdminAuthPath('/', '/')).toBe(false)
  })
})
