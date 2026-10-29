import { describe, expect, test } from 'bun:test'
import { createBindInviteGoogle } from '../../../../src/modules/invitations/services/accept/bind-invite-google'

describe('bindInviteGoogle — BA ensure before OAuth cookie', () => {
  test('reclaims stale BA email then creates user matching Payload id', async () => {
    const deletedBa: string[] = []
    const createdBa: Array<{ id: string; email: string }> = []
    const baUsers = [{ id: 'stale-ba', email: 'invitee@example.com' }]
    const invitationId = 'inv-1'
    const userId = 'payload-user-1'
    const token = 'invite-token'

    const host = {
      withAdvisoryLocks: async (_locks: unknown, fn: () => Promise<unknown>) => fn(),
      dbNow: async () => new Date('2026-10-06T12:00:00.000Z'),
      getPayload: async () => ({
        findByID: async (args: { collection: string; id: string }) => {
          if (args.collection === 'invitations' && args.id === invitationId) {
            return {
              userId,
              email: 'invitee@example.com',
              status: 'pending',
              activeUserId: userId,
              expiresAt: '2099-01-01T00:00:00.000Z',
              authorizedRoleIds: ['role-1'],
            }
          }
          if (args.collection === 'users' && args.id === userId) {
            return {
              id: userId,
              email: 'invitee@example.com',
              fullName: 'Invitee',
              isActive: false,
              provisioningStatus: 'provisioning',
              roles: ['role-1'],
            }
          }
          return null
        },
      }),
    }

    const auth = {
      $context: Promise.resolve({
        internalAdapter: {
          findVerificationValue: async (id: string) =>
            id === `invite:${token}` ? { value: userId, invitationId } : null,
        },
      }),
    }

    const facade = {
      findUserById: async (id: string) => baUsers.find((u) => u.id === id) ?? null,
      findUserByEmail: async (email: string) => baUsers.find((u) => u.email === email) ?? null,
      deleteUser: async (id: string) => {
        deletedBa.push(id)
        const i = baUsers.findIndex((u) => u.id === id)
        if (i >= 0) baUsers.splice(i, 1)
      },
      createUser: async (args: { id: string; email: string; name: string }) => {
        createdBa.push({ id: args.id, email: args.email })
        baUsers.push({ id: args.id, email: args.email })
        return args
      },
    }

    const bind = createBindInviteGoogle(
      host as never,
      auth as never,
      'test-secret-at-least-32-chars-long!!',
      facade as never
    )
    const result = await bind({ invitationId, token })

    expect(result).toEqual(expect.objectContaining({ ok: true }))
    expect(deletedBa).toContain('stale-ba')
    expect(createdBa).toEqual([{ id: userId, email: 'invitee@example.com' }])
    expect(baUsers.some((u) => u.id === userId)).toBe(true)
  })
})
