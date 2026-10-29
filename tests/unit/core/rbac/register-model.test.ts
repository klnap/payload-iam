import { describe, expect, test } from 'bun:test'
import {
  defineRbacModel,
  normalizeRbacRegisterItem,
  unionRegisterTabOps,
} from '../../../../src/core/rbac/register-model'

describe('defineRbacModel', () => {
  test('defaults ops to read', () => {
    const m = defineRbacModel({ id: 'reports', label: 'Reports' })
    expect(m.ops).toEqual(['read'])
  })

  test('rejects fieldOp not in entity ops', () => {
    expect(() =>
      defineRbacModel({
        id: 'x',
        label: 'X',
        ops: ['read'],
        fieldOps: ['update'],
      })
    ).toThrow(/fieldOp "update"/)
  })

  test('multi-op model', () => {
    const m = defineRbacModel({
      id: 'queue',
      label: 'Queue',
      ops: ['read', 'manage', 'update'],
      fields: [{ path: 'retry', label: 'Retry failed' }],
      fieldOps: ['read', 'update'],
    })
    expect(m.ops).toEqual(['read', 'manage', 'update'])
  })
})

describe('normalizeRbacRegisterItem', () => {
  test('maps fields to matrix entries', () => {
    const n = normalizeRbacRegisterItem(
      {
        id: 'v',
        label: 'V',
        fields: [{ path: 'a', label: 'A', allowUpdate: false }],
        ops: ['read', 'update'],
        fieldOps: ['read', 'update'],
      },
      'Other'
    )
    expect(n.fields[0]?.allowUpdate).toBe(false)
  })
})

describe('per-field ops', () => {
  test('normalize keeps row ops', () => {
    const n = normalizeRbacRegisterItem(
      {
        id: 'v',
        label: 'V',
        ops: ['create', 'read', 'update'],
        fieldOps: ['create', 'read', 'update'],
        fields: [{ path: 'title', label: 'Title', ops: ['read', 'update'] }],
      },
      'Tab'
    )
    expect(n.fields[0]?.ops).toEqual(['read', 'update'])
  })
})

describe('unionRegisterTabOps', () => {
  test('preserves first-seen order', () => {
    const ops = unionRegisterTabOps([
      { id: 'a', label: 'A', ops: ['read', 'manage'], fieldOps: ['read'], fields: [] },
      { id: 'b', label: 'B', ops: ['read', 'publish'], fieldOps: ['read'], fields: [] },
    ])
    expect(ops).toEqual(['read', 'manage', 'publish'])
  })
})
