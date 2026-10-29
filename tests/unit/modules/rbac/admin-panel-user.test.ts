import { describe, expect, test } from 'bun:test'
import { BA_ADMIN_SESSION_CHANNEL } from '../../../../src/modules/auth/config/auth-channel'
import {
  canUseAdminShell,
  isAdminPanelUser,
  isClientAdminPanelUser,
} from '../../../../src/modules/rbac/access/admin-panel-user'

describe('isAdminPanelUser', () => {
  test('denies empty / placeholder user', () => {
    expect(isAdminPanelUser(null)).toBe(false)
    expect(isAdminPanelUser({})).toBe(false)
    expect(isAdminPanelUser({ id: '1', email: '', authChannel: BA_ADMIN_SESSION_CHANNEL })).toBe(
      false
    )
  })

  test('denies session without auth channel', () => {
    expect(
      isAdminPanelUser({
        id: '1',
        email: 'a@b.com',
        isActive: true,
        roles: [{ name: 'Root' }],
      })
    ).toBe(false)
  })

  test('allows verified admin session', () => {
    expect(
      isAdminPanelUser({
        id: '1',
        email: 'a@b.com',
        isActive: true,
        authChannel: BA_ADMIN_SESSION_CHANNEL,
        roles: [{ name: 'Root' }],
      })
    ).toBe(true)
  })
})

describe('isClientAdminPanelUser', () => {
  test('allows /me shape without authChannel when roles assigned', () => {
    expect(
      isClientAdminPanelUser({
        id: '1',
        email: 'a@b.com',
        isActive: true,
        roles: ['role-id-1'],
      })
    ).toBe(true)
  })

  test('allows /me shape without email when roles assigned', () => {
    expect(
      isClientAdminPanelUser({
        id: '1',
        isActive: true,
        roles: ['role-id-1'],
      })
    ).toBe(true)
  })

  test('denies without roles', () => {
    expect(
      isClientAdminPanelUser({
        id: '1',
        email: 'a@b.com',
        isActive: true,
        roles: [],
      })
    ).toBe(false)
  })
})

describe('canUseAdminShell', () => {
  test('allows when Payload permissions grant admin access without roles on user', () => {
    expect(
      canUseAdminShell(
        { id: '1', email: 'a@b.com', isActive: true, roles: [] },
        { canAccessAdmin: true }
      )
    ).toBe(true)
  })

  test('allows id+roles without email when permissions unset', () => {
    expect(canUseAdminShell({ id: '1', isActive: true, roles: ['role-id-1'] }, null)).toBe(true)
  })

  test('denies without permissions and without roles', () => {
    expect(canUseAdminShell({ id: '1', email: 'a@b.com', isActive: true, roles: [] }, null)).toBe(
      false
    )
  })
})
