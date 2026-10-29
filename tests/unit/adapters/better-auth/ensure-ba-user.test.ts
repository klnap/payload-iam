import { describe, expect, test } from 'bun:test'
import {
  deleteBaUserPreferIdThenEmail,
  ensureBaUserMatchesPayload,
} from '../../../../src/adapters/better-auth/ensure-ba-user'

describe('ensureBaUserMatchesPayload', () => {
  test('no-ops when BA id already matches', async () => {
    const created: string[] = []
    const facade = {
      findUserById: async () => ({ id: 'u1' }),
      findUserByEmail: async () => {
        throw new Error('should not look up email')
      },
      deleteUser: async () => {
        throw new Error('should not delete')
      },
      createUser: async (args: { id: string }) => {
        created.push(args.id)
      },
    }
    await ensureBaUserMatchesPayload(facade as never, {
      userId: 'u1',
      email: 'a@b.com',
      name: 'A',
    })
    expect(created).toEqual([])
  })

  test('reclaims stale BA email then creates with Payload id', async () => {
    const deleted: string[] = []
    const created: Array<{ id: string; email: string }> = []
    const ba = [{ id: 'stale', email: 'a@b.com' }]
    const facade = {
      findUserById: async (id: string) => ba.find((u) => u.id === id) ?? null,
      findUserByEmail: async (email: string) => ba.find((u) => u.email === email) ?? null,
      deleteUser: async (id: string) => {
        deleted.push(id)
        const i = ba.findIndex((u) => u.id === id)
        if (i >= 0) ba.splice(i, 1)
      },
      createUser: async (args: { id: string; email: string; name: string }) => {
        created.push({ id: args.id, email: args.email })
        ba.push({ id: args.id, email: args.email })
      },
    }
    await ensureBaUserMatchesPayload(facade as never, {
      userId: 'payload-id',
      email: 'A@B.com',
      name: 'Name',
    })
    expect(deleted).toEqual(['stale'])
    expect(created).toEqual([{ id: 'payload-id', email: 'a@b.com' }])
  })
})

describe('deleteBaUserPreferIdThenEmail', () => {
  test('deletes by id and any leftover email row', async () => {
    const deleted: string[] = []
    const ba = [
      { id: 'payload-id', email: 'x@y.com' },
      { id: 'orphan', email: 'x@y.com' },
    ]
    // findUserByEmail returns first match — simulate leftover after id delete
    const facade = {
      deleteUser: async (id: string) => {
        deleted.push(id)
        const i = ba.findIndex((u) => u.id === id)
        if (i >= 0) ba.splice(i, 1)
      },
      findUserByEmail: async (email: string) => ba.find((u) => u.email === email) ?? null,
    }
    await deleteBaUserPreferIdThenEmail(facade as never, {
      userId: 'payload-id',
      email: 'x@y.com',
    })
    expect(deleted).toContain('payload-id')
    expect(deleted).toContain('orphan')
  })
})
