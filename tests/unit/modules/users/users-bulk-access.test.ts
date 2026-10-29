import { describe, expect, test } from 'bun:test'
import { BA_ADMIN_SESSION_CHANNEL } from '../../../../src/modules/auth/config/auth-channel'
import { patchOwnedUsersCollection } from '../../../../src/modules/users/collections/patch-owned-users-collection'

describe('users access — bulk update/delete', () => {
  test('update without id is denied (blocks bulk Root demotion)', async () => {
    const users = patchOwnedUsersCollection(
      {
        slug: 'users',
        fields: [{ name: 'email', type: 'email' }],
        access: {},
      } as never,
      {
        usersSlug: 'users',
        loginFlags: { forgotPassword: true, google: false, emailAndPassword: true },
      }
    )
    const update = users.access?.update
    expect(update).toBeTypeOf('function')
    const result = await update!({
      id: undefined,
      req: {
        user: {
          id: 'admin-1',
          type: 'human',
          isActive: true,
          provisioningStatus: 'none',
          authChannel: BA_ADMIN_SESSION_CHANNEL,
          roles: [
            {
              name: 'Editor',
              permissions: { collections: { users: { update: true, read: true } } },
            },
          ],
        },
      },
    } as never)
    expect(result).toBe(false)
  })

  test('delete without id follows users.delete grant (UI probe; bulk blocked by disableBulkDelete)', async () => {
    const users = patchOwnedUsersCollection(
      {
        slug: 'users',
        fields: [{ name: 'email', type: 'email' }],
        access: {},
      } as never,
      {
        usersSlug: 'users',
        loginFlags: { forgotPassword: true, google: false, emailAndPassword: true },
      }
    )
    expect(users.disableBulkDelete).toBe(true)
    const del = users.access?.delete
    expect(del).toBeTypeOf('function')
    const allowed = await del!({
      id: undefined,
      req: {
        user: {
          id: 'admin-1',
          type: 'human',
          isActive: true,
          provisioningStatus: 'none',
          authChannel: BA_ADMIN_SESSION_CHANNEL,
          roles: [
            {
              name: 'Editor',
              permissions: { collections: { users: { delete: true, read: true } } },
            },
          ],
        },
      },
    } as never)
    expect(allowed).toBe(true)

    const denied = await del!({
      id: undefined,
      req: {
        user: {
          id: 'admin-1',
          type: 'human',
          isActive: true,
          provisioningStatus: 'none',
          authChannel: BA_ADMIN_SESSION_CHANNEL,
          roles: [
            {
              name: 'Editor',
              permissions: { collections: { users: { read: true, update: true } } },
            },
          ],
        },
      },
    } as never)
    expect(denied).toBe(false)
  })

  test('delete of lower-ceiling target is allowed; higher / self / Root denied', async () => {
    const users = patchOwnedUsersCollection(
      {
        slug: 'users',
        fields: [{ name: 'email', type: 'email' }],
        access: {},
      } as never,
      {
        usersSlug: 'users',
        loginFlags: { forgotPassword: true, google: false, emailAndPassword: true },
      }
    )
    const del = users.access?.delete
    expect(del).toBeTypeOf('function')

    const editorCaller = {
      id: 'editor-1',
      type: 'human',
      isActive: true,
      provisioningStatus: 'none',
      authChannel: BA_ADMIN_SESSION_CHANNEL,
      roles: [
        {
          name: 'Editor',
          permissions: {
            collections: {
              users: { delete: true, read: true },
              projects: { read: true },
            },
          },
        },
      ],
    }

    const findByID = async ({ id }: { id: string }) => {
      if (id === 'lower') {
        return {
          id: 'lower',
          roles: [
            {
              name: 'Viewer',
              permissions: { collections: { projects: { read: true } } },
            },
          ],
        }
      }
      if (id === 'higher') {
        return {
          id: 'higher',
          roles: [
            {
              name: 'Senior',
              permissions: { collections: { secrets: { delete: true } } },
            },
          ],
        }
      }
      if (id === 'root-user') {
        return {
          id: 'root-user',
          roles: [{ name: 'Root', permissions: {} }],
        }
      }
      if (id === 'editor-1') {
        return { id: 'editor-1', roles: editorCaller.roles }
      }
      return null
    }

    const reqBase = {
      user: editorCaller,
      payload: { findByID },
    }

    expect(await del!({ id: 'lower', req: reqBase } as never)).toBe(true)
    expect(await del!({ id: 'higher', req: reqBase } as never)).toBe(false)
    expect(await del!({ id: 'root-user', req: reqBase } as never)).toBe(false)
    expect(await del!({ id: 'editor-1', req: reqBase } as never)).toBe(false)
  })

  test('list read for non-Root excludes roles above ceiling', async () => {
    const users = patchOwnedUsersCollection(
      {
        slug: 'users',
        fields: [{ name: 'email', type: 'email' }],
        access: {},
      } as never,
      {
        usersSlug: 'users',
        loginFlags: { forgotPassword: true, google: false, emailAndPassword: true },
      }
    )
    const read = users.access?.read
    expect(read).toBeTypeOf('function')
    const result = await read!({
      id: undefined,
      req: {
        user: {
          id: 'admin-1',
          type: 'human',
          isActive: true,
          provisioningStatus: 'none',
          authChannel: BA_ADMIN_SESSION_CHANNEL,
          roles: [
            {
              name: 'Editor',
              permissions: {
                collections: {
                  users: { read: true },
                  projects: { read: true },
                },
              },
            },
          ],
        },
        payload: {
          find: async () => ({
            docs: [
              { id: 'root-role-id', name: 'Root', permissions: {} },
              {
                id: 'senior-role-id',
                name: 'Senior',
                permissions: { collections: { secrets: { delete: true } } },
              },
              {
                id: 'editor-role-id',
                name: 'Editor',
                permissions: { collections: { projects: { read: true }, users: { read: true } } },
              },
            ],
          }),
        },
      },
    } as never)
    expect(result).toEqual({ roles: { not_in: ['root-role-id', 'senior-role-id'] } })
  })

  test('unlock is denied', async () => {
    const users = patchOwnedUsersCollection(
      {
        slug: 'users',
        fields: [{ name: 'email', type: 'email' }],
        access: { unlock: () => true },
      } as never,
      {
        usersSlug: 'users',
        loginFlags: { forgotPassword: true, google: false, emailAndPassword: true },
      }
    )
    expect(await users.access!.unlock!({} as never)).toBe(false)
  })
})
