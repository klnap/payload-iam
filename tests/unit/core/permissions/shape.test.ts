import { describe, expect, test } from 'bun:test'
import {
  emptyPermissions,
  formatMatrixFieldLabel,
  matrixLeafFieldLabel,
  walkFieldPaths,
} from '../../../../src/core/permissions/shape'

describe('permissions-shape', () => {
  test('emptyPermissions baseline', () => {
    expect(emptyPermissions()).toEqual({
      collections: {},
      globals: {},
      register: {},
    })
  })

  test('matrixLeafFieldLabel uses last segment only', () => {
    expect(matrixLeafFieldLabel('SEO > Title')).toBe('Title')
    expect(matrixLeafFieldLabel('Title')).toBe('Title')
  })

  test('formatMatrixFieldLabel strips per-locale suffix', () => {
    expect(formatMatrixFieldLabel('Image (per locale)')).toBe('Image')
    expect(formatMatrixFieldLabel('SEO > Title (Per Locale)')).toBe('SEO > Title')
  })

  test('walkFieldPaths flattens tabs + nested group', () => {
    const paths = walkFieldPaths([
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Main',
            fields: [
              { name: 'title', type: 'text', label: 'Title' },
              {
                type: 'group',
                name: 'seo',
                label: 'SEO',
                fields: [{ name: 'slug', type: 'text', label: 'Slug' }],
              },
            ],
          },
        ],
      },
    ])
    const byPath = Object.fromEntries(paths.map((p) => [p.path, p.label]))
    expect(byPath.title).toBe('Title')
    expect(byPath.seo).toBe('SEO')
    expect(byPath['seo.slug']).toBe('SEO > Slug')
  })

  test('dedupes duplicate paths', () => {
    const paths = walkFieldPaths([
      { name: 'title', type: 'text', label: 'A' },
      { name: 'title', type: 'text', label: 'B' },
    ])
    expect(paths.filter((p) => p.path === 'title')).toHaveLength(1)
    expect(paths[0]?.label).toBe('A')
  })

  test('skips ui / hidden / skip-list; readOnly rows are read-only ops', () => {
    const paths = walkFieldPaths([
      { name: 'identity', type: 'ui', label: 'Identity' },
      { name: 'fullName', type: 'text', label: 'Full name' },
      { name: 'isRoot', type: 'checkbox', admin: { hidden: true } },
      {
        name: 'permissionsGlobalsUi',
        type: 'ui',
        label: 'Permissions Globals Ui',
      },
      {
        name: 'permissions',
        type: 'json',
        label: 'Permission',
      },
      {
        name: 'deadline',
        type: 'date',
        admin: { readOnly: true },
      },
      { name: 'status', type: 'select', admin: { readOnly: true } },
      { name: 'title', type: 'text' },
      { name: 'filename', type: 'text', admin: { hidden: true, readOnly: true } },
      { name: 'secret', type: 'text', access: { read: false } },
    ])
    expect(paths.map((p) => p.path).sort()).toEqual([
      'deadline',
      'fullName',
      'permissions',
      'status',
      'title',
    ])
    expect(paths.find((p) => p.path === 'deadline')?.ops).toEqual(['read'])
    expect(paths.find((p) => p.path === 'status')?.allowUpdate).toBe(false)
    expect(paths.find((p) => p.path === 'status')?.ops).toEqual(['read'])
    expect(paths.find((p) => p.path === 'fullName')?.ops).toEqual(['create', 'read', 'update'])
    expect(paths.find((p) => p.path === 'title')?.ops).toEqual(['create', 'read', 'update'])
  })

  test('walkFieldPaths includes admin-hidden fullName for users matrix', () => {
    const paths = walkFieldPaths([
      {
        name: 'fullName',
        type: 'text',
        label: 'Full name',
        admin: { hidden: true },
      },
      { name: 'email', type: 'email', admin: { hidden: true } },
    ])
    expect(paths.map((p) => p.path)).toEqual(['fullName'])
  })

  test('walkFieldPaths strips (per locale) from labels', () => {
    const paths = walkFieldPaths([
      { name: 'heroImage', type: 'upload', label: 'Image (per locale)' },
    ])
    expect(paths[0]?.label).toBe('Image')
  })

  test('virtual fields are read-only in matrix', () => {
    const paths = walkFieldPaths([
      { name: 'computed', type: 'text', virtual: true, label: 'Computed' },
    ])
    expect(paths).toHaveLength(1)
    expect(paths[0]?.ops).toEqual(['read'])
    expect(paths[0]?.allowUpdate).toBe(false)
  })
})
