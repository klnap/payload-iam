import { describe, expect, test } from 'bun:test'
import { BA_ADMIN_SESSION_CHANNEL } from '../../../../src/modules/auth/config/auth-channel'
import {
  canAccessAdmin,
  canAccessRegister,
  canAccessRegisterField,
  effectiveIsRoot,
  effectivePermissions,
  pluginCollectionPermission,
  pluginGlobalPermission,
  wrapGlobalAccess,
  wrapModelAccess,
} from '../../../../src/modules/rbac/access/can'

const editor = {
  isActive: true,
  authChannel: BA_ADMIN_SESSION_CHANNEL,
  roles: [
    {
      name: 'Editor',
      permissions: {
        collections: {
          projects: {
            create: true,
            read: true,
            update: true,
            delete: true,
            publish: true,
          },
        },
        globals: {
          'home-page': { read: true },
        },
      },
    },
  ],
}

const root = {
  isActive: true,
  authChannel: BA_ADMIN_SESSION_CHANNEL,
  roles: [{ name: 'Root' }],
}

describe('effectivePermissions / effectiveIsRoot', () => {
  test('root is detected by reserved name; permissions union is empty', () => {
    expect(effectiveIsRoot(root)).toBe(true)
    expect(effectivePermissions(root)).toEqual({
      collections: {},
      globals: {},
      register: {},
    })
  })

  test('iamIsRoot flag when role docs are not populated on client', () => {
    expect(effectiveIsRoot({ isActive: true, iamIsRoot: true, roles: ['role-id-only'] })).toBe(true)
  })

  test('unions permissions across roles (shallow)', () => {
    const multi = {
      isActive: true,
      roles: [
        {
          permissions: {
            collections: { projects: { read: true } },
            register: { 'scheduled-events': { read: true } },
          },
        },
        {
          permissions: {
            collections: { media: { read: true, update: true } },
            globals: { 'about-page': { update: true } },
            register: { reports: { read: true } },
          },
        },
      ],
    }
    const perms = effectivePermissions(multi as never)
    expect(perms?.collections?.projects).toEqual({ read: true })
    expect(perms?.collections?.media).toEqual({ read: true, update: true })
    expect(perms?.globals?.['about-page']).toEqual({ update: true })
    expect(perms?.register?.['scheduled-events']).toEqual({ read: true })
    expect(perms?.register?.reports).toEqual({ read: true })
  })

  test('no roles ⇒ null permissions', () => {
    expect(effectivePermissions({ isActive: true, roles: [] })).toBeNull()
    expect(effectivePermissions(null)).toBeNull()
  })
})

describe('pluginCollectionPermission', () => {
  test('Editor: projects yes, media no', () => {
    expect(pluginCollectionPermission(editor, 'projects', 'read')).toBe(true)
    expect(pluginCollectionPermission(editor, 'media', 'read')).toBe(false)
    expect(pluginCollectionPermission(editor, 'projects', 'create')).toBe(true)
  })

  test('unlock follows update; readVersions follows read', () => {
    expect(pluginCollectionPermission(editor, 'projects', 'unlock')).toBe(true)
    expect(pluginCollectionPermission(editor, 'projects', 'readVersions')).toBe(true)
    expect(pluginCollectionPermission(editor, 'media', 'unlock')).toBe(false)
    expect(pluginCollectionPermission(editor, 'media', 'readVersions')).toBe(false)
  })

  test('inactive / provisioning / service DENY', () => {
    expect(pluginCollectionPermission({ ...editor, isActive: false }, 'projects', 'read')).toBe(
      false
    )
    expect(
      pluginCollectionPermission(
        { ...editor, provisioningStatus: 'provisioning' },
        'projects',
        'read'
      )
    ).toBe(false)
    expect(
      pluginCollectionPermission({ type: 'service', isActive: true }, 'projects', 'read')
    ).toBe(false)
  })

  test('Root ALLOW any collection op', () => {
    expect(pluginCollectionPermission(root, 'roles', 'delete')).toBe(true)
    expect(pluginCollectionPermission(root, 'users', 'read')).toBe(true)
  })
})

describe('pluginGlobalPermission', () => {
  test('Editor: home-page read yes, update no; other global no', () => {
    expect(pluginGlobalPermission(editor, 'home-page', 'read')).toBe(true)
    expect(pluginGlobalPermission(editor, 'home-page', 'update')).toBe(false)
    expect(pluginGlobalPermission(editor, 'about-page', 'read')).toBe(false)
  })

  test('readVersions follows read', () => {
    expect(pluginGlobalPermission(editor, 'home-page', 'readVersions')).toBe(true)
    expect(pluginGlobalPermission(editor, 'about-page', 'readVersions')).toBe(false)
  })
})

describe('wrapModelAccess host content', () => {
  test('anonymous uses hostOnly (token path)', async () => {
    const access = wrapModelAccess({
      collection: 'media',
      op: 'read',
      packageOwned: false,
      hostAccess: () => true,
    })
    expect(await access({ req: { user: null } } as never)).toBe(true)
  })

  test('anonymous without hostAccess DENY', async () => {
    const access = wrapModelAccess({
      collection: 'media',
      op: 'read',
      packageOwned: false,
    })
    expect(await access({ req: { user: null } } as never)).toBe(false)
  })

  test('Editor ∩ host false = false even with collection perm', async () => {
    const access = wrapModelAccess({
      collection: 'projects',
      op: 'read',
      packageOwned: false,
      hostAccess: () => false,
    })
    expect(await access({ req: { user: editor } } as never)).toBe(false)
  })

  test('update without publish flag OK; publishSpecificLocale requires publish grant', async () => {
    const draftOnly = {
      isActive: true,
      authChannel: BA_ADMIN_SESSION_CHANNEL,
      roles: [
        {
          name: 'Draft editor',
          permissions: {
            collections: { projects: { read: true, update: true } },
          },
        },
      ],
    }
    const access = wrapModelAccess({
      collection: 'projects',
      op: 'update',
      packageOwned: false,
    })
    expect(await access({ req: { user: draftOnly, query: {} } } as never)).toBe(true)
    expect(
      await access({
        req: { user: draftOnly, query: { publishSpecificLocale: 'pl' } },
      } as never)
    ).toBe(false)
    expect(
      await access({
        req: { user: editor, query: { publishSpecificLocale: 'pl' } },
      } as never)
    ).toBe(true)
    expect(
      await access({
        req: { user: draftOnly, query: {} },
        data: { _status: 'published' },
      } as never)
    ).toBe(false)
    expect(
      await access({
        req: { user: draftOnly, query: { draft: true } },
        data: { _status: 'published' },
      } as never)
    ).toBe(true)
  })

  test('service uses hostOnly (bypasses role matrix)', async () => {
    const access = wrapModelAccess({
      collection: 'media',
      op: 'read',
      packageOwned: false,
      hostAccess: () => true,
    })
    expect(
      await access({
        req: { user: { type: 'service', isActive: true } },
      } as never)
    ).toBe(true)
  })
})

describe('wrapGlobalAccess', () => {
  test('ALLOW when global perm + host true', async () => {
    const access = wrapGlobalAccess({
      global: 'home-page',
      op: 'read',
      hostAccess: () => true,
    })
    expect(await access({ req: { user: editor } } as never)).toBe(true)
  })

  test('DENY when missing global perm even if host true', async () => {
    const access = wrapGlobalAccess({
      global: 'about-page',
      op: 'read',
      hostAccess: () => true,
    })
    expect(await access({ req: { user: editor } } as never)).toBe(false)
  })

  test('update publish mutation requires globals.publish grant', async () => {
    const draftOnly = {
      isActive: true,
      authChannel: BA_ADMIN_SESSION_CHANNEL,
      roles: [
        {
          name: 'Global draft',
          permissions: {
            globals: { 'home-page': { read: true, update: true } },
          },
        },
      ],
    }
    const withPublish = {
      isActive: true,
      authChannel: BA_ADMIN_SESSION_CHANNEL,
      roles: [
        {
          name: 'Global publisher',
          permissions: {
            globals: { 'home-page': { read: true, update: true, publish: true } },
          },
        },
      ],
    }
    const access = wrapGlobalAccess({
      global: 'home-page',
      op: 'update',
    })
    expect(await access({ req: { user: draftOnly, query: {} } } as never)).toBe(true)
    expect(
      await access({
        req: { user: draftOnly, query: { publishSpecificLocale: 'pl' } },
      } as never)
    ).toBe(false)
    expect(
      await access({
        req: { user: withPublish, query: { publishSpecificLocale: 'pl' } },
      } as never)
    ).toBe(true)
  })
})

describe('canAccessAdmin edges', () => {
  test('provisioning human DENY panel', () => {
    expect(
      canAccessAdmin({
        isActive: true,
        authChannel: BA_ADMIN_SESSION_CHANNEL,
        provisioningStatus: 'deleting',
        roles: [{ name: 'Root' }],
      })
    ).toBe(false)
  })

  test('inactive DENY', () => {
    expect(
      canAccessAdmin({
        isActive: false,
        authChannel: BA_ADMIN_SESSION_CHANNEL,
        roles: [{ name: 'Root' }],
      })
    ).toBe(false)
  })
})

describe('canAccessRegister', () => {
  test('root always allowed', () => {
    expect(canAccessRegister(root, 'scheduled-events')).toBe(true)
  })

  test('requires permissions.register[id].read', () => {
    const withView = {
      isActive: true,
      roles: [
        {
          permissions: {
            register: { 'scheduled-events': { read: true } },
          },
        },
      ],
    }
    expect(canAccessRegister(withView as never, 'scheduled-events')).toBe(true)
    expect(canAccessRegister(withView as never, 'other')).toBe(false)
    expect(canAccessRegister(editor, 'scheduled-events')).toBe(false)
  })

  test('checks arbitrary register op', () => {
    const withManage = {
      roles: [
        {
          permissions: {
            register: { queue: { read: true, manage: true } },
          },
        },
      ],
    }
    expect(canAccessRegister(withManage as never, 'queue', 'manage')).toBe(true)
    expect(canAccessRegister(withManage as never, 'queue', 'publish')).toBe(false)
  })

  test('canAccessRegisterField requires parent + field flag', () => {
    const user = {
      roles: [
        {
          permissions: {
            register: {
              app: {
                read: true,
                fields: { settings: { read: true, update: false } },
              },
            },
          },
        },
      ],
    }
    expect(canAccessRegisterField(user as never, 'app', 'settings', 'read')).toBe(true)
    expect(canAccessRegisterField(user as never, 'app', 'settings', 'update')).toBe(false)
    expect(canAccessRegisterField(user as never, 'app', 'other', 'read')).toBe(false)
  })
})
