import { describe, expect, test } from 'bun:test'
import { unionRolePermissions } from '../../../../src/core/permissions/union-role-permissions'
import { effectivePermissions } from '../../../../src/modules/rbac/access/can'

describe('unionRolePermissions', () => {
  test('collection ops are order-independent (grant wins)', () => {
    const a = { collections: { posts: { read: true, update: false } } }
    const b = { collections: { posts: { update: true, delete: true } } }
    const ab = unionRolePermissions(a, b)
    const ba = unionRolePermissions(b, a)
    expect(ab.collections?.posts).toEqual({ read: true, update: true, delete: true })
    expect(ba.collections?.posts).toEqual(ab.collections?.posts)
  })

  test('field ops union across roles', () => {
    const a = {
      collections: {
        posts: {
          read: true,
          fields: { title: { read: true, update: false } },
        },
      },
    }
    const b = {
      collections: {
        posts: {
          fields: { title: { update: true }, body: { read: true } },
        },
      },
    }
    const merged = unionRolePermissions(a, b)
    expect(merged.collections?.posts?.fields?.title).toEqual({ read: true, update: true })
    expect(merged.collections?.posts?.fields?.body).toEqual({ read: true })
  })

  test('ignores prototype pollution keys in stored JSON', () => {
    const malicious = {
      collections: {
        posts: { read: true },
        __proto__: { read: true },
      },
    } as Record<string, unknown>
    const merged = unionRolePermissions({}, malicious as never)
    expect(Object.keys(merged.collections ?? {})).toEqual(['posts'])
  })
})

describe('effectivePermissions conflicting roles', () => {
  test('order-independent grants for same collection', () => {
    const userA = {
      isActive: true,
      roles: [
        { permissions: { collections: { media: { read: true, update: false } } } },
        { permissions: { collections: { media: { update: true } } } },
      ],
    }
    const userB = {
      isActive: true,
      roles: [...userA.roles].reverse(),
    }
    expect(effectivePermissions(userA as never)?.collections?.media).toEqual({
      read: true,
      update: true,
    })
    expect(effectivePermissions(userB as never)?.collections?.media).toEqual({
      read: true,
      update: true,
    })
  })
})
