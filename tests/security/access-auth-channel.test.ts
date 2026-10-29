import { describe, expect, test } from 'bun:test'
import { BA_ADMIN_SESSION_CHANNEL } from '../../src/modules/auth/config/auth-channel'
import { canAccessAdmin, intersectAccess, wrapModelAccess } from '../../src/modules/rbac/access/can'

describe('Gate E — access + authChannel', () => {
  test('false ∩ anything = false', () => {
    expect(intersectAccess(false, { id: { equals: '1' } })).toBe(false)
  })

  test('service cannot access admin', () => {
    expect(
      canAccessAdmin({
        type: 'service',
        isActive: true,
        roles: [{ name: 'Root' }],
      })
    ).toBe(false)
  })

  test('human without ba-admin-session DENY admin', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        roles: [{ name: 'Root' }],
      })
    ).toBe(false)
  })

  test('human with ba-admin-session + root ALLOW admin', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        authChannel: BA_ADMIN_SESSION_CHANNEL,
        roles: [{ name: 'Root' }],
      })
    ).toBe(true)
  })

  test('human with role + session ALLOW admin panel entry', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        authChannel: BA_ADMIN_SESSION_CHANNEL,
        roles: [{ permissions: {} }],
      })
    ).toBe(true)
  })

  test('package-owned wrapModelAccess DENY anonymous', async () => {
    const access = wrapModelAccess({
      collection: 'users',
      op: 'read',
      packageOwned: true,
    })
    const result = await access({
      req: { user: null },
    } as never)
    expect(result).toBe(false)
  })

  test('package-owned wrapModelAccess DENY service', async () => {
    const access = wrapModelAccess({
      collection: 'users',
      op: 'read',
      packageOwned: true,
    })
    const result = await access({
      req: { user: { type: 'service', isActive: true } },
    } as never)
    expect(result).toBe(false)
  })

  test('host wrapModelAccess DENY human without collection perm', async () => {
    const access = wrapModelAccess({
      collection: 'media',
      op: 'read',
      packageOwned: false,
      hostAccess: () => true,
    })
    const result = await access({
      req: {
        user: {
          isActive: true,
          authChannel: BA_ADMIN_SESSION_CHANNEL,
          roles: [
            {
              permissions: {
                collections: { projects: { read: true, update: true } },
              },
            },
          ],
        },
      },
    } as never)
    expect(result).toBe(false)
  })

  test('host wrapModelAccess ALLOW human with collection perm', async () => {
    const access = wrapModelAccess({
      collection: 'projects',
      op: 'read',
      packageOwned: false,
      hostAccess: () => true,
    })
    const result = await access({
      req: {
        user: {
          isActive: true,
          authChannel: BA_ADMIN_SESSION_CHANNEL,
          roles: [
            {
              permissions: {
                collections: { projects: { read: true } },
              },
            },
          ],
        },
      },
    } as never)
    expect(result).toBe(true)
  })

  test('host wrapGlobalAccess DENY without global perm', async () => {
    const { wrapGlobalAccess } = await import('../../src/modules/rbac/access/can')
    const access = wrapGlobalAccess({
      global: 'home-page',
      op: 'read',
      hostAccess: () => true,
    })
    const result = await access({
      req: {
        user: {
          isActive: true,
          authChannel: BA_ADMIN_SESSION_CHANNEL,
          roles: [
            {
              permissions: {
                collections: { projects: { read: true } },
              },
            },
          ],
        },
      },
    } as never)
    expect(result).toBe(false)
  })
})
