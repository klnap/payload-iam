import { describe, expect, mock, test } from 'bun:test'
import { createSessionsService } from '../../../../src/modules/sessions/services/create-sessions-service'

describe('revokeSessionForUser invalidates token', () => {
  test('deleteSession runs after findSession validates userId', async () => {
    const deleteSession = mock(async () => {})
    const findSession = mock(async (token: string) =>
      token === 'tok-1' ? { session: { token: 'tok-1', userId: 'user-1' } } : null
    )

    const auth = {
      api: { getSession: async () => null },
      $context: Promise.resolve({
        internalAdapter: { listSessions: async () => [], findSession, deleteSession },
      }),
    }

    const service = createSessionsService(auth)
    await service.revokeSessionForUser({ targetUserId: 'user-1', token: 'tok-1' })

    expect(findSession).toHaveBeenCalledWith('tok-1')
    expect(deleteSession).toHaveBeenCalledWith('tok-1')
  })

  test('wrong userId skips deleteSession', async () => {
    const deleteSession = mock(async () => {})
    const findSession = mock(async () => ({
      session: { token: 'tok-1', userId: 'other-user' },
    }))

    const auth = {
      api: { getSession: async () => null },
      $context: Promise.resolve({
        internalAdapter: { listSessions: async () => [], findSession, deleteSession },
      }),
    }

    const service = createSessionsService(auth)
    await expect(
      service.revokeSessionForUser({ targetUserId: 'user-1', token: 'tok-1' })
    ).rejects.toThrow('Session not found')
    expect(deleteSession).not.toHaveBeenCalled()
  })
})
