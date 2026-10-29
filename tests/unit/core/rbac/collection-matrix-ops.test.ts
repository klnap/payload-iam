import { describe, expect, test } from 'bun:test'
import {
  collectionEntityMatrixOps,
  collectionMatrixFrameOps,
} from '../../../../src/core/rbac/collection-matrix-model'

describe('collectionEntityMatrixOps', () => {
  test('omits publish without drafts', () => {
    expect(collectionEntityMatrixOps({})).toEqual(['create', 'read', 'update', 'delete'])
  })

  test('includes publish with drafts', () => {
    expect(collectionEntityMatrixOps({ versions: { drafts: true } })).toEqual([
      'create',
      'read',
      'update',
      'delete',
      'publish',
    ])
  })

  test('frame ops union', () => {
    expect(collectionMatrixFrameOps([{}, { versions: { drafts: true } }])).toEqual([
      'create',
      'read',
      'update',
      'delete',
      'publish',
    ])
  })
})
