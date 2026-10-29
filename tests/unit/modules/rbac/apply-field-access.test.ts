import { describe, expect, test } from 'bun:test'
import type { TextField } from 'payload'
import { BA_ADMIN_SESSION_CHANNEL } from '../../../../src/modules/auth/config/auth-channel'
import { applyRbacFieldAccess } from '../../../../src/modules/rbac/access/apply-field-access'

const editor = {
  isActive: true,
  authChannel: BA_ADMIN_SESSION_CHANNEL,
  roles: [
    {
      permissions: {
        collections: {
          pages: {
            read: true,
            update: true,
            fields: {
              title: { read: true, update: true },
              slug: { read: true, update: false },
            },
          },
        },
      },
    },
  ],
}

async function fieldUpdateAllowed(
  fields: TextField[],
  user: typeof editor | null,
  name: string
): Promise<boolean> {
  const wrapped = applyRbacFieldAccess({
    fields,
    kind: 'collections',
    slug: 'pages',
    packageOwned: false,
  }) as TextField[]
  const field = wrapped.find((f) => f.name === name)
  const access = field?.access?.update
  if (!access) return false
  return Boolean(await access({ req: { user } } as never))
}

describe('applyRbacFieldAccess', () => {
  test('denies field update when matrix marks update false', async () => {
    const fields: TextField[] = [
      { name: 'title', type: 'text' },
      { name: 'slug', type: 'text' },
    ]
    expect(await fieldUpdateAllowed(fields, editor, 'slug')).toBe(false)
  })

  test('allows field update when matrix grants update', async () => {
    const fields: TextField[] = [{ name: 'title', type: 'text' }]
    const wrapped = applyRbacFieldAccess({
      fields,
      kind: 'collections',
      slug: 'pages',
      packageOwned: false,
    }) as TextField[]
    const access = wrapped[0]?.access?.update
    expect(await access!({ req: { user: editor } } as never)).toBe(true)
  })

  test('inherits collection update when field row missing', async () => {
    const user = {
      ...editor,
      roles: [
        {
          permissions: {
            collections: {
              pages: { read: true, update: true },
            },
          },
        },
      ],
    }
    const fields: TextField[] = [{ name: 'body', type: 'text' }]
    expect(await fieldUpdateAllowed(fields, user as never, 'body')).toBe(true)
  })

  test('anonymous read without host field access denies (fail-closed)', async () => {
    const fields: TextField[] = [{ name: 'sanity', type: 'text' }]
    const wrapped = applyRbacFieldAccess({
      fields,
      kind: 'collections',
      slug: 'media',
      packageOwned: false,
    }) as TextField[]
    const access = wrapped[0]?.access?.read
    expect(await access!({ req: { user: null } } as never)).toBe(false)
  })

  test('anonymous uses host field access only', async () => {
    const fields: TextField[] = [
      {
        name: 'public',
        type: 'text',
        access: { update: () => true },
      },
    ]
    const wrapped = applyRbacFieldAccess({
      fields,
      kind: 'collections',
      slug: 'pages',
      packageOwned: false,
    }) as TextField[]
    const access = wrapped[0]?.access?.update
    expect(await access!({ req: { user: null } } as never)).toBe(true)
  })

  test('global field create requires global update (no entity create)', async () => {
    const user = {
      isActive: true,
      authChannel: BA_ADMIN_SESSION_CHANNEL,
      roles: [
        {
          permissions: {
            globals: {
              settings: {
                read: true,
                update: true,
                fields: { items: { create: true, read: true, update: true } },
              },
            },
          },
        },
      ],
    }
    const fields: TextField[] = [{ name: 'items', type: 'text' }]
    const wrapped = applyRbacFieldAccess({
      fields,
      kind: 'globals',
      slug: 'settings',
      packageOwned: false,
    }) as TextField[]
    const createAccess = wrapped[0]?.access?.create
    expect(await createAccess!({ req: { user } } as never)).toBe(true)

    const denied = {
      ...user,
      roles: [
        {
          permissions: {
            globals: {
              settings: {
                read: true,
                update: false,
                fields: { items: { create: true } },
              },
            },
          },
        },
      ],
    }
    expect(await createAccess!({ req: { user: denied } } as never)).toBe(false)
  })

  test('users self-read allows identity fields without users.read', async () => {
    const junior = {
      id: 'me',
      isActive: true,
      authChannel: BA_ADMIN_SESSION_CHANNEL,
      roles: [
        {
          permissions: {
            collections: {
              pages: { read: true },
            },
          },
        },
      ],
    }
    const fields: TextField[] = [
      { name: 'email', type: 'text' },
      { name: 'provisioningRequestHash', type: 'text' },
    ]
    const wrapped = applyRbacFieldAccess({
      fields,
      kind: 'collections',
      slug: 'users',
      packageOwned: true,
    }) as TextField[]
    const emailRead = wrapped.find((f) => f.name === 'email')?.access?.read
    const hashRead = wrapped.find((f) => f.name === 'provisioningRequestHash')?.access?.read
    expect(await emailRead!({ req: { user: junior }, id: 'me' } as never)).toBe(true)
    expect(await hashRead!({ req: { user: junior }, id: 'me' } as never)).toBe(false)
  })
})
