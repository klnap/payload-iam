import { describe, expect, test } from 'bun:test'
import { BA_ADMIN_SESSION_CHANNEL } from '../../../../../src/modules/auth/config/auth-channel'
import { createRolesCollection } from '../../../../../src/modules/rbac/collections/roles.collection'
import {
  assertRoleEditable,
  assertRolePermissionsWithinCeiling,
  assertRolesAssignable,
  filterEntitySlugsByCeiling,
  filterRolesWithinCeiling,
  INVITE_ROLE_BEYOND_CEILING,
  INVITE_ROOT_ROLE,
  ROLE_CREATE_PERMS_BEYOND_CEILING,
  ROLE_OUTSIDE_CEILING,
  ROLE_PERMS_BEYOND_CEILING,
  resolveCallerCeiling,
  roleIdsOutsideCallerCeiling,
  roleWithinCallerCeiling,
} from '../../../../../src/modules/rbac/domain/ceiling'

const editorCeiling = {
  collections: {
    projects: { read: true, update: true },
    'contact-forms': { read: true },
  },
  globals: { 'home-page': { read: true } },
  register: { 'scheduled-events': { read: true } },
}

const editor = {
  isActive: true,
  authChannel: BA_ADMIN_SESSION_CHANNEL,
  roles: [{ name: 'Editor', permissions: editorCeiling }],
}

const root = {
  isActive: true,
  authChannel: BA_ADMIN_SESSION_CHANNEL,
  roles: [{ name: 'Root' }],
}

const roleEditorOnly = {
  id: 'role-editor',
  name: 'Editor',
  permissions: {
    collections: { projects: { read: true } },
  },
}

const roleHigher = {
  id: 'role-adminish',
  name: 'Almost Admin',
  permissions: {
    collections: {
      projects: { read: true, update: true, delete: true },
    },
  },
}

const roleRoot = {
  id: 'role-root',
  name: 'Root',
  permissions: {},
}

const roleEqual = {
  id: 'role-equal',
  name: 'Twin',
  permissions: editorCeiling,
}

describe('resolveCallerCeiling', () => {
  test('root → root sentinel', () => {
    expect(resolveCallerCeiling(root)).toBe('root')
  })

  test('editor → unioned permissions', () => {
    expect(resolveCallerCeiling(editor)).toEqual(editorCeiling)
  })

  test('no user / no roles → null', () => {
    expect(resolveCallerCeiling(null)).toBeNull()
    expect(resolveCallerCeiling({ roles: [] })).toBeNull()
  })
})

describe('roleWithinCallerCeiling / filterRolesWithinCeiling', () => {
  test('filters invite options to ⊆ caller', () => {
    const out = filterRolesWithinCeiling([roleEditorOnly, roleHigher, roleRoot, roleEqual], editor)
    expect(out.map((r) => r.id)).toEqual(['role-editor', 'role-equal'])
  })

  test('root sees all non-root roles', () => {
    const out = filterRolesWithinCeiling([roleEditorOnly, roleHigher, roleRoot], root)
    expect(out.map((r) => r.id)).toEqual(['role-editor', 'role-adminish'])
  })

  test('Root role never within ceiling', () => {
    expect(roleWithinCallerCeiling(roleRoot, 'root')).toBe(false)
    expect(roleWithinCallerCeiling(roleRoot, editorCeiling)).toBe(false)
  })
})

describe('assertRolesAssignable (invite gate)', () => {
  test('allows subset roles for editor', () => {
    expect(() => assertRolesAssignable([roleEditorOnly, roleEqual], editor)).not.toThrow()
  })

  test('rejects higher role', () => {
    expect(() => assertRolesAssignable([roleHigher], editor)).toThrow(INVITE_ROLE_BEYOND_CEILING)
  })

  test('rejects Root role for everyone including root caller', () => {
    expect(() => assertRolesAssignable([roleRoot], root)).toThrow(INVITE_ROOT_ROLE)
  })

  test('rejects Root role for non-root', () => {
    expect(() => assertRolesAssignable([roleRoot], editor)).toThrow(INVITE_ROOT_ROLE)
  })
})

describe('assertRolePermissionsWithinCeiling (role save)', () => {
  test('create: subset ok', () => {
    expect(() =>
      assertRolePermissionsWithinCeiling(
        { collections: { projects: { read: true } } },
        editor,
        'create'
      )
    ).not.toThrow()
  })

  test('create: beyond → create message', () => {
    expect(() =>
      assertRolePermissionsWithinCeiling(
        { collections: { projects: { delete: true } } },
        editor,
        'create'
      )
    ).toThrow(ROLE_CREATE_PERMS_BEYOND_CEILING)
  })

  test('update: beyond → update message', () => {
    expect(() =>
      assertRolePermissionsWithinCeiling(
        {
          collections: {
            projects: { read: true },
            secrets: { read: true },
          },
        },
        editor,
        'update'
      )
    ).toThrow(ROLE_PERMS_BEYOND_CEILING)
  })

  test('root bypass', () => {
    expect(() =>
      assertRolePermissionsWithinCeiling(
        { collections: { anything: { delete: true } } },
        root,
        'create'
      )
    ).not.toThrow()
  })

  test('equal bag ok', () => {
    expect(() => assertRolePermissionsWithinCeiling(editorCeiling, editor, 'update')).not.toThrow()
  })

  test('assertRoleEditable: denies role above caller ceiling', () => {
    const senior = {
      name: 'Senior',
      permissions: {
        collections: {
          projects: { read: true, delete: true },
          secrets: { read: true },
        },
      },
    }
    expect(() => assertRoleEditable(senior, editor)).toThrow(ROLE_OUTSIDE_CEILING)
    expect(() =>
      assertRoleEditable({ name: 'Editor', permissions: editorCeiling }, editor)
    ).not.toThrow()
    expect(() => assertRoleEditable(senior, root)).not.toThrow()
  })

  test('roleIdsOutsideCallerCeiling lists Root and higher bags', () => {
    const ids = roleIdsOutsideCallerCeiling(
      [
        { id: 'r1', name: 'Root', permissions: {} },
        {
          id: 'r2',
          name: 'Senior',
          permissions: { collections: { projects: { delete: true } } },
        },
        { id: 'r3', name: 'Editor', permissions: editorCeiling },
      ],
      editorCeiling
    )
    expect(ids.sort()).toEqual(['r1', 'r2'])
  })
})

describe('filterEntitySlugsByCeiling (matrix)', () => {
  test('root keeps all', () => {
    expect(filterEntitySlugsByCeiling(['a', 'b'], 'collections', 'root')).toEqual(['a', 'b'])
  })

  test('editor keeps only granted collections', () => {
    expect(
      filterEntitySlugsByCeiling(
        ['projects', 'media', 'contact-forms'],
        'collections',
        editorCeiling
      )
    ).toEqual(['projects', 'contact-forms'])
  })

  test('null ceiling → empty', () => {
    expect(filterEntitySlugsByCeiling(['projects'], 'collections', null)).toEqual([])
  })
})

describe('Roles beforeChange hook wiring', () => {
  const col = createRolesCollection()
  const hook = col.hooks?.beforeChange?.[0]
  if (!hook || typeof hook !== 'function') {
    throw new Error('expected Roles beforeChange hook')
  }

  const run = (args: {
    data: Record<string, unknown>
    operation: 'create' | 'update'
    originalDoc?: Record<string, unknown>
    user?: unknown
    context?: Record<string, unknown>
  }) =>
    hook({
      data: args.data,
      operation: args.operation,
      originalDoc: args.originalDoc,
      req: { user: args.user, context: args.context } as never,
    } as never)

  test('create rejects perms beyond editor', () => {
    expect(() =>
      run({
        operation: 'create',
        user: editor,
        data: {
          name: 'Escalated',
          permissions: {
            collections: { projects: { delete: true } },
          },
        },
      })
    ).toThrow(ROLE_CREATE_PERMS_BEYOND_CEILING)
  })

  test('create allows subset for editor', () => {
    const out = run({
      operation: 'create',
      user: editor,
      data: {
        name: 'Ok',
        permissions: { collections: { projects: { read: true } } },
      },
    }) as { name?: string }
    expect(out.name).toBe('Ok')
  })

  test('create blocks reserved Root name outside BOOTSTRAP', () => {
    expect(() =>
      run({
        operation: 'create',
        user: root,
        data: { name: 'Root', permissions: {} },
      })
    ).toThrow('Role.create must not use reserved name "Root"')
  })

  test('update rejects escalate', () => {
    expect(() =>
      run({
        operation: 'update',
        user: editor,
        originalDoc: { name: 'Editor' },
        data: {
          name: 'Editor',
          permissions: {
            collections: { projects: { read: true, publish: true } },
          },
        },
      })
    ).toThrow(ROLE_PERMS_BEYOND_CEILING)
  })

  test('root update keeps reserved name', () => {
    const out = run({
      operation: 'update',
      user: root,
      originalDoc: { name: 'Root' },
      data: { name: 'Hacked', permissions: {} },
    }) as { name?: string }
    expect(out.name).toBe('Root')
  })

  test('update blocks renaming a role to Root', () => {
    expect(() =>
      run({
        operation: 'update',
        user: root,
        originalDoc: { name: 'Editor' },
        data: { name: 'Root', permissions: {} },
      })
    ).toThrow('Cannot rename role to reserved name "Root"')
  })

  test('BOOTSTRAP create skips ceiling', () => {
    const out = run({
      operation: 'create',
      user: null,
      context: { payloadRbacOp: 'BOOTSTRAP' },
      data: {
        name: 'Root',
        permissions: { collections: { anything: { delete: true } } },
      },
    }) as { name?: string }
    expect(out.name).toBe('Root')
  })
})
