import { describe, expect, test } from 'bun:test'
import { invalidatePasswordEmailTokens } from '../../../../src/modules/auth/methods/email-and-password/services/invalidate-password-email-tokens'

describe('invalidatePasswordEmailTokens', () => {
  test('deletes matching plain prefix and preserves 2fa / invite rows', async () => {
    const deleted: string[] = []
    const adapter = {
      findMany: async () => [
        { id: '1', identifier: 'reset-password:aaa' },
        { id: '2', identifier: 'set-password:bbb' },
        { id: '3', identifier: 'reset-password:ccc' },
        { id: '4', identifier: '2fa-xyz' },
        { id: '5', identifier: 'hashed-invite-row', invitationId: 'inv-1' },
      ],
      delete: async (args: { where: Array<{ value: string }> }) => {
        deleted.push(args.where[0]!.value)
      },
    }
    const n = await invalidatePasswordEmailTokens(adapter, 'user-1', 'reset-password:')
    expect(n).toBe(2)
    expect(deleted.sort()).toEqual(['1', '3'])
  })

  test('deletes hashed password-email identifiers (no readable prefix)', async () => {
    const deleted: string[] = []
    const adapter = {
      findMany: async () => [
        { id: 'h1', identifier: 'a'.repeat(64) },
        { id: '2fa', identifier: '2fa-abc' },
        { id: 'inv', identifier: 'b'.repeat(64), invitationId: 'inv-9' },
      ],
      delete: async (args: { where: Array<{ value: string }> }) => {
        deleted.push(args.where[0]!.value)
      },
    }
    const n = await invalidatePasswordEmailTokens(adapter, 'user-1', 'set-password:')
    expect(n).toBe(1)
    expect(deleted).toEqual(['h1'])
  })

  test('no-ops on empty userId', async () => {
    const n = await invalidatePasswordEmailTokens(
      {
        findMany: async () => [{ id: '1', identifier: 'reset-password:x' }],
        delete: async () => {
          throw new Error('should not delete')
        },
      },
      '',
      'reset-password:'
    )
    expect(n).toBe(0)
  })
})
