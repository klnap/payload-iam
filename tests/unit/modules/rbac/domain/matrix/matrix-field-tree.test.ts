import { describe, expect, test } from 'bun:test'
import {
  fieldAncestorOpsAllow,
  isDescendantFieldPath,
  parentFieldPath,
} from '../../../../../../src/modules/rbac/domain/matrix/matrix-field-tree'

describe('parentFieldPath', () => {
  test('nested path', () => {
    expect(parentFieldPath('sync.status')).toBe('sync')
  })

  test('top-level', () => {
    expect(parentFieldPath('sync')).toBeNull()
  })
})

describe('fieldAncestorOpsAllow', () => {
  const on = (path: string, op: string) => path === 'sync' && op === 'read'

  test('requires parent op', () => {
    expect(fieldAncestorOpsAllow('sync.status', 'read', on)).toBe(true)
    expect(fieldAncestorOpsAllow('sync.status', 'update', on)).toBe(false)
  })
})

describe('isDescendantFieldPath', () => {
  test('detects prefix', () => {
    expect(isDescendantFieldPath('sync.status', 'sync')).toBe(true)
    expect(isDescendantFieldPath('sync', 'sync')).toBe(false)
  })
})
