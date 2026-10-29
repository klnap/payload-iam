import { describe, expect, test } from 'bun:test'
import type { Field } from 'payload'
import {
  lockListColumns,
  withOwnedTimestamps,
} from '../../../../src/modules/users/config/list-columns'

function adminOf(fields: Field[], name: string): Record<string, unknown> | null {
  for (const f of fields) {
    if ('tabs' in f && Array.isArray(f.tabs)) {
      for (const tab of f.tabs) {
        const nested = adminOf(tab.fields ?? [], name)
        if (nested) return nested
      }
    }
    if ('fields' in f && Array.isArray(f.fields)) {
      const nested = adminOf(f.fields, name)
      if (nested) return nested
    }
    if ('name' in f && f.name === name && 'admin' in f) {
      return (f.admin ?? {}) as Record<string, unknown>
    }
  }
  return null
}

describe('lockListColumns', () => {
  test('keeps allowlisted fields listable; locks the rest', () => {
    const fields = lockListColumns(
      [
        { name: 'email', type: 'email' },
        { name: 'userId', type: 'text' },
        { name: 'version', type: 'number' },
      ],
      new Set(['email'])
    )
    expect(adminOf(fields, 'email')?.disableListColumn).not.toBe(true)
    expect(adminOf(fields, 'userId')).toMatchObject({
      disableListColumn: true,
      disableListFilter: true,
    })
    expect(adminOf(fields, 'version')).toMatchObject({
      disableListColumn: true,
      disableListFilter: true,
    })
  })

  test('locks nested tab fields not on allowlist', () => {
    const fields = lockListColumns(
      [
        {
          type: 'tabs',
          tabs: [
            {
              label: 'Collections',
              fields: [
                { name: 'name', type: 'text' },
                { name: 'permissions', type: 'json' },
              ],
            },
          ],
        },
      ],
      new Set(['name'])
    )
    expect(adminOf(fields, 'name')?.disableListColumn).not.toBe(true)
    expect(adminOf(fields, 'permissions')).toMatchObject({
      disableListColumn: true,
      disableListFilter: true,
    })
  })

  test('preserves existing admin flags while adding lock', () => {
    const fields = lockListColumns(
      [
        {
          name: 'secret',
          type: 'text',
          admin: { hidden: true, readOnly: true },
        },
      ],
      new Set()
    )
    expect(adminOf(fields, 'secret')).toMatchObject({
      hidden: true,
      readOnly: true,
      disableListColumn: true,
      disableListFilter: true,
    })
  })
})

describe('withOwnedTimestamps', () => {
  test('adds createdAt + updatedAt once', () => {
    const once = withOwnedTimestamps([{ name: 'name', type: 'text' }])
    expect(once.filter((f) => 'name' in f && f.name === 'createdAt')).toHaveLength(1)
    expect(once.filter((f) => 'name' in f && f.name === 'updatedAt')).toHaveLength(1)
    const twice = withOwnedTimestamps(once)
    expect(twice.filter((f) => 'name' in f && f.name === 'createdAt')).toHaveLength(1)
  })

  test('adds deletedAt only when trash', () => {
    const noTrash = withOwnedTimestamps([])
    expect(noTrash.some((f) => 'name' in f && f.name === 'deletedAt')).toBe(false)
    const trash = withOwnedTimestamps([], { trash: true })
    expect(trash.some((f) => 'name' in f && f.name === 'deletedAt')).toBe(true)
  })
})
