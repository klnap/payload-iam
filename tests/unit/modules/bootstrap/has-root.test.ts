import { describe, expect, test } from 'bun:test'
import { hasRoot } from '../../../../src/modules/bootstrap/services/has-root'

describe('hasRoot', () => {
  test('returns false when schema tables are missing', async () => {
    const payload = {
      find: async () => {
        throw Object.assign(new Error('Failed query'), {
          cause: { code: '42P01', message: 'relation "roles" does not exist' },
        })
      },
    } as never

    await expect(hasRoot(payload, 'users')).resolves.toBe(false)
  })
})
