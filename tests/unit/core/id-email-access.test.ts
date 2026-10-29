import { describe, expect, test } from 'bun:test'
import { normalizeEmail } from '../../../src/adapters/email/email'
import { assertUuidV7, newId } from '../../../src/core/identity/ids'
import { canAccessAdmin, intersectAccess } from '../../../src/modules/rbac/access/can'

describe('uuid v7', () => {
  test('newId is v7', () => {
    const id = newId()
    assertUuidV7(id)
    expect(id[14]).toBe('7')
  })
})

describe('email', () => {
  test('normalize lower+trim', () => {
    expect(normalizeEmail('  A@B.C  ')).toBe('a@b.c')
  })
})

describe('intersectAccess', () => {
  test('false wins', () => {
    expect(intersectAccess(false, true)).toBe(false)
    expect(intersectAccess(true, false)).toBe(false)
  })

  test('Where ∩ true = Where', () => {
    const w = { id: { equals: '1' } }
    expect(intersectAccess(w, true)).toEqual(w)
  })
})

describe('canAccessAdmin', () => {
  test('root role', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        authChannel: 'ba-admin-session',
        roles: [{ name: 'Root' }],
      })
    ).toBe(true)
  })

  test('service denied', () => {
    expect(canAccessAdmin({ type: 'service', isActive: true })).toBe(false)
  })
})
