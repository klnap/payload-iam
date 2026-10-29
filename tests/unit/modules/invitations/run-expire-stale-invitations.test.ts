import { describe, expect, mock, test } from 'bun:test'
import { runExpireStaleInvitations } from '../../../../src/modules/invitations/services/expiry/run-expire-stale-invitations'

describe('runExpireStaleInvitations', () => {
  test('expires each pending row past expiresAt', async () => {
    const expireInvitation = mock(async () => ({ ok: true }))
    const payload = {
      find: mock(async () => ({
        docs: [{ id: 'inv-a' }, { id: 'inv-b' }],
      })),
    }

    const result = await runExpireStaleInvitations({
      payload: payload as never,
      api: { expireInvitation },
      actor: { type: 'system', reason: 'cron' },
      now: new Date('2026-01-01T00:00:00.000Z'),
    })

    expect(result.scanned).toBe(2)
    expect(result.expired).toEqual(['inv-a', 'inv-b'])
    expect(expireInvitation).toHaveBeenCalledTimes(2)
  })
})
