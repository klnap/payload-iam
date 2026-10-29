import { describe, expect, test } from 'bun:test'
import { createHash, randomBytes } from 'node:crypto'
import { orderAdvisoryLocks } from '../../src/adapters/pg/locks'
import { sortUnique } from '../../src/core/identity/sort-unique'
import { hashServiceToken } from '../../src/modules/auth/services/pre-payload-service-auth'

describe('Gate E — service token + locks', () => {
  test('service token hash is sha256 hex', () => {
    const raw = randomBytes(32).toString('hex')
    const h = hashServiceToken(raw)
    expect(h).toBe(createHash('sha256').update(raw, 'utf8').digest('hex'))
    expect(h).toHaveLength(64)
  })

  test('advisory lock order EMAIL → USER → ROOT → ROLE', () => {
    const ordered = orderAdvisoryLocks([
      { kind: 'ROLE_GUARD', roleId: 'b' },
      { kind: 'AUTHZ_ROOT_GUARD' },
      { kind: 'USER_LIFECYCLE_GUARD', userId: 'u1' },
      { kind: 'EMAIL_PROVISION_GUARD', email: 'a@b.c' },
      { kind: 'ROLE_GUARD', roleId: 'a' },
    ])
    expect(ordered.map((l) => l.kind)).toEqual([
      'EMAIL_PROVISION_GUARD',
      'USER_LIFECYCLE_GUARD',
      'AUTHZ_ROOT_GUARD',
      'ROLE_GUARD',
      'ROLE_GUARD',
    ])
    expect(
      ordered
        .filter((l) => l.kind === 'ROLE_GUARD')
        .map((l) => (l.kind === 'ROLE_GUARD' ? l.roleId : ''))
    ).toEqual(['a', 'b'])
  })

  test('expire/revoke lock set has no EMAIL', () => {
    const expireLocks = orderAdvisoryLocks([
      { kind: 'USER_LIFECYCLE_GUARD', userId: 'u1' },
      { kind: 'ROLE_GUARD', roleId: 'r2' },
      { kind: 'ROLE_GUARD', roleId: 'r1' },
    ])
    expect(expireLocks.some((l) => l.kind === 'EMAIL_PROVISION_GUARD')).toBe(false)
    expect(expireLocks.map((l) => l.kind)).toEqual([
      'USER_LIFECYCLE_GUARD',
      'ROLE_GUARD',
      'ROLE_GUARD',
    ])
  })

  test('sortUnique for ROLE_GUARD caller∪affected', () => {
    expect(sortUnique(['c', 'a', 'b', 'a'])).toEqual(['a', 'b', 'c'])
  })
})
