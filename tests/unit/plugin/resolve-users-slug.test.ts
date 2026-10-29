import { describe, expect, test } from 'bun:test'
import type { CollectionConfig } from 'payload'
import { resolveUsersSlug } from '../../../src/plugin/resolve-users-slug'

const Users = { slug: 'users' } as CollectionConfig

describe('resolveUsersSlug', () => {
  test('uses admin.user when users option omitted', () => {
    expect(resolveUsersSlug({ admin: { user: 'staff' } })).toBe('staff')
  })

  test('falls back to users when no admin.user', () => {
    expect(resolveUsersSlug({ admin: {} })).toBe('users')
    expect(resolveUsersSlug({})).toBe('users')
  })

  test('uses users collection slug when passed', () => {
    expect(resolveUsersSlug({ admin: { user: 'users' } }, Users)).toBe('users')
  })

  test('throws when users.slug disagrees with admin.user', () => {
    expect(() => resolveUsersSlug({ admin: { user: 'staff' } }, Users)).toThrow(
      /must match admin\.user/
    )
  })
})
