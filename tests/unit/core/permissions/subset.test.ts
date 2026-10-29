import { describe, expect, test } from 'bun:test'
import {
  entityHasAnyOp,
  isPermissionsSubset,
  opAllowed,
} from '../../../../src/core/permissions/subset'

describe('isPermissionsSubset', () => {
  test('empty subject always ok', () => {
    expect(isPermissionsSubset({}, { collections: {} })).toBe(true)
    expect(isPermissionsSubset(null, null)).toBe(true)
  })

  test('rejects when ceiling missing', () => {
    expect(isPermissionsSubset({ collections: { projects: { read: true } } }, null)).toBe(false)
  })

  test('collection op must be covered', () => {
    const ceiling = { collections: { projects: { read: true } } }
    expect(isPermissionsSubset({ collections: { projects: { read: true } } }, ceiling)).toBe(true)
    expect(
      isPermissionsSubset({ collections: { projects: { read: true, update: true } } }, ceiling)
    ).toBe(false)
  })

  test('cannot grant unknown collection', () => {
    expect(
      isPermissionsSubset(
        { collections: { secrets: { read: true } } },
        { collections: { projects: { read: true } } }
      )
    ).toBe(false)
  })

  test('field ops must be covered', () => {
    const ceiling = {
      collections: {
        forms: {
          read: true,
          update: true,
          fields: { status: { read: true, update: true } },
        },
      },
    }
    expect(
      isPermissionsSubset(
        {
          collections: {
            forms: {
              read: true,
              fields: { status: { read: true } },
            },
          },
        },
        ceiling
      )
    ).toBe(true)
    expect(
      isPermissionsSubset(
        {
          collections: {
            forms: {
              update: true,
              fields: { name: { update: true } },
            },
          },
        },
        ceiling
      )
    ).toBe(false)
  })

  test('register subset', () => {
    const ceiling = { register: { 'scheduled-events': { read: true } } }
    expect(isPermissionsSubset({ register: { 'scheduled-events': { read: true } } }, ceiling)).toBe(
      true
    )
    expect(isPermissionsSubset({ register: { other: { read: true } } }, ceiling)).toBe(false)
  })
})

describe('entityHasAnyOp / opAllowed', () => {
  test('entityHasAnyOp ignores fields bag', () => {
    expect(entityHasAnyOp({ fields: { a: { read: true } } })).toBe(false)
    expect(entityHasAnyOp({ read: true, fields: {} })).toBe(true)
  })

  test('opAllowed root always', () => {
    expect(opAllowed('root', 'collections', 'x', 'delete')).toBe(true)
  })

  test('opAllowed checks ceiling', () => {
    const ceiling = { collections: { projects: { read: true } } }
    expect(opAllowed(ceiling, 'collections', 'projects', 'read')).toBe(true)
    expect(opAllowed(ceiling, 'collections', 'projects', 'update')).toBe(false)
  })
})
