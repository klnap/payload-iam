import { describe, expect, test } from 'bun:test'
import { createCreateSharedUser } from '../../../../src/modules/users/services/create-shared-user'

describe('createSharedUser — BA email reclaim', () => {
  test('deletes stale Better Auth user by email before creating invite anchor', async () => {
    const deletedBa: string[] = []
    const createdBa: Array<{ id: string; email: string }> = []
    const payloadUsers: Array<Record<string, unknown>> = []
    const invitations: Array<Record<string, unknown>> = []

    const host = {
      withAdvisoryLocks: async (_locks: unknown, fn: () => Promise<unknown>) => fn(),
      consumeRateLimit: async () => ({ allowed: true }),
      dbNow: async () => new Date('2026-10-06T12:00:00.000Z'),
      sendInviteEmail: async () => {},
      baseURL: 'http://localhost',
      adminRoute: '/admin',
      getPayload: async () => ({
        find: async (args: {
          collection: string
          where?: {
            email?: { equals?: string }
            and?: Array<{ userId?: { equals?: string }; status?: { equals?: string } }>
          }
        }) => {
          if (args.collection === 'users') {
            const email = args.where?.email?.equals
            return {
              docs: email ? payloadUsers.filter((u) => u.email === email) : [],
            }
          }
          if (args.collection === 'invitations') {
            const userIdEq = args.where?.and?.find((c) => c.userId)?.userId?.equals
            if (userIdEq) {
              return {
                docs: invitations.filter((i) => i.userId === userIdEq && i.status === 'pending'),
              }
            }
            return { docs: invitations }
          }
          return { docs: [] }
        },
        findByID: async (args: { collection: string; id: string }) => {
          if (args.collection === 'roles') {
            return { id: args.id, name: 'Editor', permissions: { collections: {} } }
          }
          return payloadUsers.find((u) => u.id === args.id) ?? null
        },
        create: async (args: { collection: string; data: Record<string, unknown> }) => {
          if (args.collection === 'users') {
            payloadUsers.push({ ...args.data })
            return { id: args.data.id }
          }
          if (args.collection === 'invitations') {
            const id = String(args.data.id ?? 'inv-1')
            invitations.push({ ...args.data, id })
            return { id }
          }
          return { id: 'x' }
        },
        update: async (args: { collection: string; id: string; data: Record<string, unknown> }) => {
          if (args.collection === 'users') {
            const row = payloadUsers.find((u) => u.id === args.id)
            if (row) Object.assign(row, args.data)
          }
          if (args.collection === 'invitations') {
            const row = invitations.find((i) => i.id === args.id)
            if (row) Object.assign(row, args.data)
          }
          return {}
        },
        delete: async (args: { collection: string; id: string }) => {
          const i = payloadUsers.findIndex((u) => u.id === args.id)
          if (i >= 0) payloadUsers.splice(i, 1)
        },
      }),
    }

    const baUsers = [{ id: 'stale-ba-id', email: 'invitee@example.com' }]

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
      createInviteVerification: async () => ({}),
      replaceInviteVerification: async () => ({}),
    }

    // Seed orphan Payload + divergent BA id (the live bug).
    payloadUsers.push({
      id: 'orphan-payload',
      email: 'invitee@example.com',
      isActive: false,
      provisioningStatus: 'provisioning',
    })

    const create = createCreateSharedUser(host as never, facade as never)
    const result = await create({
      email: 'invitee@example.com',
      fullName: 'Invitee',
      roleIds: ['role-1'],
      actor: { type: 'human', userId: 'admin-1' },
      skipInvite: true,
    })

    expect(deletedBa).toContain('stale-ba-id')
    expect(deletedBa).toContain('orphan-payload')
    expect(createdBa.some((u) => u.email === 'invitee@example.com')).toBe(true)
    expect(result.email).toBe('invitee@example.com')
    expect(payloadUsers.some((u) => u.email === 'invitee@example.com' && u.isActive === true)).toBe(
      true
    )
  })

  test('lazy invite does not create user in Payload users or Better Auth', async () => {
    const createdBa: Array<{ id: string; email: string }> = []
    const payloadUsers: Array<Record<string, unknown>> = []
    const invitations: Array<Record<string, unknown>> = []

    const host = {
      withAdvisoryLocks: async (_locks: unknown, fn: () => Promise<unknown>) => fn(),
      consumeRateLimit: async () => ({ allowed: true }),
      dbNow: async () => new Date('2026-10-06T12:00:00.000Z'),
      sendInviteEmail: async () => {},
      baseURL: 'http://localhost',
      adminRoute: '/admin',
      getPayload: async () => ({
        find: async (args: { collection: string; where?: { email?: { equals?: string } } }) => {
          if (args.collection === 'users') {
            const email = args.where?.email?.equals
            return { docs: email ? payloadUsers.filter((u) => u.email === email) : [] }
          }
          if (args.collection === 'invitations') {
            const email = args.where?.email?.equals
            return { docs: email ? invitations.filter((i) => i.email === email) : [] }
          }
          return { docs: [] }
        },
        findByID: async (args: { collection: string; id: string }) => {
          if (args.collection === 'roles') {
            return { id: args.id, name: 'Editor', permissions: { collections: {} } }
          }
          return null
        },
        create: async (args: { collection: string; data: Record<string, unknown> }) => {
          if (args.collection === 'users') {
            payloadUsers.push({ ...args.data })
            return { id: args.data.id }
          }
          if (args.collection === 'invitations') {
            const id = String(args.data.id ?? 'inv-lazy')
            invitations.push({ ...args.data, id })
            return { id }
          }
          return { id: 'x' }
        },
      }),
    }

    const facade = {
      findUserById: async () => null,
      findUserByEmail: async () => null,
      createUser: async (args: { id: string; email: string }) => {
        createdBa.push(args)
        return args
      },
      createInviteVerification: async () => ({}),
      replaceInviteVerification: async () => ({}),
    }

    const create = createCreateSharedUser(host as never, facade as never)
    const result = await create({
      email: 'new-invitee@example.com',
      fullName: 'New Invitee',
      roleIds: ['role-1'],
      actor: { type: 'human', userId: 'admin-1' },
    })

    expect(result.invitationId).toBeDefined()
    expect(result.inviteUrl).toContain('/invite/accept')
    expect(payloadUsers.length).toBe(0) // NO user created in Payload users
    expect(createdBa.length).toBe(0) // NO user created in Better Auth
    expect(invitations.length).toBe(1)
    expect(invitations[0]!.email).toBe('new-invitee@example.com')
    expect(invitations[0]!.status).toBe('pending')
    expect(invitations[0]!.userId).toBeDefined()
    expect(invitations[0]!.activeUserId).toBe(invitations[0]!.userId)
  })
})
