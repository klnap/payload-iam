import { describe, expect, test } from 'bun:test'
import { findDocById } from '../../../../src/adapters/payload/find-doc-by-id'

describe('findDocById', () => {
  test('returns null when document is missing (no NotFound throw)', async () => {
    const payload = {
      findByID: async () => {
        const err = new Error('Not Found') as Error & { status: number; name: string }
        err.status = 404
        err.name = 'NotFound'
        throw err
      },
    }
    const doc = await findDocById(payload, { collection: 'users', id: 'missing' })
    expect(doc).toBeNull()
  })

  test('returns doc when present', async () => {
    const payload = {
      findByID: async () => ({ id: 'u1', email: 'a@b.c' }),
    }
    const doc = await findDocById<{ id: string; email: string }>(payload, {
      collection: 'users',
      id: 'u1',
    })
    expect(doc?.email).toBe('a@b.c')
  })
})
