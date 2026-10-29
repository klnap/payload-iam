import { describe, expect, test } from 'bun:test'
import {
  globalEntityMatrixOps,
  globalHasDraftsEnabled,
  globalMatrixFrameOps,
} from '../../../../src/core/rbac/global-matrix-model'

describe('global-matrix-model', () => {
  test('globalHasDraftsEnabled respects versions.drafts', () => {
    expect(globalHasDraftsEnabled({})).toBe(false)
    expect(globalHasDraftsEnabled({ versions: { drafts: { autosave: true } } })).toBe(true)
  })

  test('entity ops: read+update; publish only with drafts', () => {
    expect(globalEntityMatrixOps({})).toEqual(['read', 'update'])
    expect(globalEntityMatrixOps({ versions: { drafts: true } })).toEqual([
      'read',
      'update',
      'publish',
    ])
  })

  test('frame ops union across globals', () => {
    expect(globalMatrixFrameOps([{}, { versions: { drafts: true } }])).toEqual([
      'create',
      'read',
      'update',
      'publish',
    ])
  })
})
