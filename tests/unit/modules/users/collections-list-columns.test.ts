import { describe, expect, test } from 'bun:test'
import type { Field } from 'payload'
import { createInvitationsCollection } from '../../../../src/modules/invitations/collections/invitations.collection'
import { createRolesCollection } from '../../../../src/modules/rbac/collections/roles.collection'

function collectNamed(
  fields: Field[],
  out: Map<string, Record<string, unknown>> = new Map()
): Map<string, Record<string, unknown>> {
  for (const f of fields) {
    if ('tabs' in f && Array.isArray(f.tabs)) {
      for (const tab of f.tabs) collectNamed(tab.fields ?? [], out)
    }
    if ('fields' in f && Array.isArray(f.fields)) {
      collectNamed(f.fields, out)
    }
    if ('name' in f && typeof f.name === 'string') {
      out.set(
        f.name,
        ('admin' in f && f.admin && typeof f.admin === 'object' ? f.admin : {}) as Record<
          string,
          unknown
        >
      )
    }
  }
  return out
}

function assertAllowlist(fields: Field[], allow: string[], mustLock: string[]) {
  const byName = collectNamed(fields)
  for (const name of allow) {
    expect(byName.has(name), `missing allowlisted field ${name}`).toBe(true)
    expect(byName.get(name)?.disableListColumn, `${name} locked`).not.toBe(true)
  }
  for (const name of mustLock) {
    expect(byName.has(name), `missing locked field ${name}`).toBe(true)
    expect(byName.get(name)).toMatchObject({
      disableListColumn: true,
      disableListFilter: true,
    })
  }
}

describe('Roles collection list columns', () => {
  test('defaultColumns + picker allowlist', () => {
    const col = createRolesCollection()
    expect(col.admin?.defaultColumns).toEqual(['name', 'users', 'createdAt', 'updatedAt'])
    assertAllowlist(
      col.fields,
      ['name', 'users', 'createdAt', 'updatedAt'],
      ['description', 'permissions', 'permissionsGlobalsUi', 'permissionsAuthUi', 'roleUsersUi']
    )
  })

  test('register option adds Other tab field', () => {
    const col = createRolesCollection([
      {
        tab: 'Other',
        items: [
          {
            id: 'scheduled-events',
            label: 'Scheduled Events',
            path: '/scheduled-events',
          },
        ],
      },
    ])
    const byName = collectNamed(col.fields)
    expect(byName.has('permissionsRegisterUi_0')).toBe(true)
    expect(byName.get('permissionsRegisterUi_0')).toMatchObject({
      custom: {
        rbacRegisterTab: 'Other',
        rbacRegisterItems: [
          {
            id: 'scheduled-events',
            label: 'Scheduled Events',
            path: '/scheduled-events',
            ops: ['read'],
            fieldOps: ['read'],
            fields: [],
          },
        ],
      },
    })
  })
})

describe('Invitations collection list columns', () => {
  test('defaultColumns + picker hides persistence guts', () => {
    const col = createInvitationsCollection()
    expect(col.admin?.defaultColumns).toEqual([
      'email',
      'fullName',
      'status',
      'expiresAt',
      'updatedAt',
    ])
    assertAllowlist(
      col.fields,
      ['email', 'fullName', 'status', 'expiresAt', 'updatedAt'],
      [
        'userId',
        'authorizedRoleIds',
        'version',
        'activeUserId',
        'terminalReason',
        'inviteLink',
        'roleOptions',
        'createdAt',
      ]
    )
  })
})
