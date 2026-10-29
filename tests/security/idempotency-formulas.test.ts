import { describe, expect, test } from 'bun:test'
import {
  provisioningOperationIdFromKey,
  provisioningOperationIdFromUserId,
} from '../../src/core/identity/provisioning-id'

describe('Gate E — idempotency formulas', () => {
  test('idempotencyKey and userId forms differ', () => {
    const a = provisioningOperationIdFromKey('caller', 'key-1')
    const b = provisioningOperationIdFromUserId('caller', 'user-1')
    expect(a).toHaveLength(64)
    expect(b).toHaveLength(64)
    expect(a).not.toBe(b)
  })
})
