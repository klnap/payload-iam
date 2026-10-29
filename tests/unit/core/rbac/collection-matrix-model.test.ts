import { describe, expect, test } from 'bun:test'
import {
  COLLECTION_MATRIX_FIELD_OPS,
  COLLECTION_MATRIX_OPS,
  collectionMatrixModel,
} from '../../../../src/core/rbac/collection-matrix-model'

describe('collectionMatrixModel', () => {
  test('matches collection matrix ops defaults', () => {
    const m = collectionMatrixModel({
      id: 'virtual',
      label: 'Virtual',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Title',
        },
      ],
    })
    expect(m.ops).toEqual([...COLLECTION_MATRIX_OPS])
    expect(m.fieldOps).toEqual([...COLLECTION_MATRIX_FIELD_OPS])
    expect(m.fields?.[0]?.path).toBe('title')
  })
})
