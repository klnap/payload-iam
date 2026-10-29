import { describe, expect, test } from 'bun:test'
import { loadRoleUserCountsCache } from '../../../../src/adapters/pg/role-user-counts'

describe('loadRoleUserCountsCache', () => {
  test('maps grouped rel rows', async () => {
    const pool = {
      query: async () => ({
        rows: [
          { role_id: 'r1', n: 3 },
          { role_id: 'r2', n: 0 },
        ],
      }),
    }
    const map = await loadRoleUserCountsCache(pool)
    expect(map.get('r1')).toBe(3)
    expect(map.get('r2')).toBe(0)
    expect(map.get('missing')).toBeUndefined()
  })
})
