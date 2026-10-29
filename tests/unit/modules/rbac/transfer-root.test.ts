import { describe, expect, test } from 'bun:test'
import type { Payload } from 'payload'
import { ROOT_ROLE_NAME } from '../../../../src/modules/bootstrap/config/root'
import { createTransferRoot } from '../../../../src/modules/rbac/services/transfer-root'
import type { HostRuntimeDeps } from '../../../../src/types/config'

const ROOT_ROLE_ID = 'role-root'
const EDITOR_ROLE_ID = 'role-editor'

function mockHost(payload: Payload, audit: unknown[] = []): HostRuntimeDeps {
  return {
    getPayload: async () => payload,
    withAdvisoryLocks: async (_locks, fn) => fn(),
    onAudit: (event) => {
      audit.push(event)
    },
  } as HostRuntimeDeps
}

function userDoc(
  id: string,
  roleIds: string[],
  extra?: { isActive?: boolean; provisioningStatus?: string }
) {
  const roles = roleIds.map((rid) => {
    if (rid === ROOT_ROLE_ID) return { id: rid, name: ROOT_ROLE_NAME }
    return { id: rid, name: 'Editor' }
  })
  return {
    id,
    roles,
    isActive: extra?.isActive ?? true,
    provisioningStatus: extra?.provisioningStatus ?? 'none',
  }
}

describe('transferRoot', () => {
  test('moves Root to target and removes it from caller when caller has another role', async () => {
    const updates: Array<{ id: string; roles: string[] }> = []
    const audit: unknown[] = []

    const payload = {
      find: async (args: { collection: string; where?: { name?: { equals: string } } }) => {
        if (args.collection === 'roles' && args.where?.name?.equals === ROOT_ROLE_NAME) {
          return { docs: [{ id: ROOT_ROLE_ID, name: ROOT_ROLE_NAME }] }
        }
        return { docs: [] }
      },
      findByID: async (args: { id: string }) => {
        if (args.id === 'actor') return userDoc('actor', [ROOT_ROLE_ID, EDITOR_ROLE_ID])
        if (args.id === 'target') return userDoc('target', [EDITOR_ROLE_ID])
        return null
      },
      create: async () => {
        throw new Error('unexpected create')
      },
      update: async (args: { id: string; data: { roles: string[] } }) => {
        updates.push({ id: String(args.id), roles: args.data.roles })
        return {}
      },
    } as unknown as Payload

    const transferRoot = createTransferRoot(mockHost(payload, audit))
    const result = await transferRoot({
      targetUserId: 'target',
      actor: { type: 'human', userId: 'actor' },
    })

    expect(result).toEqual({ ok: true })
    expect(updates).toEqual([
      { id: 'actor', roles: [EDITOR_ROLE_ID] },
      { id: 'target', roles: [EDITOR_ROLE_ID, ROOT_ROLE_ID] },
    ])
    expect(audit).toEqual([
      {
        type: 'root_transferred',
        fromUserId: 'actor',
        toUserId: 'target',
        actor: { type: 'human', userId: 'actor' },
      },
    ])
  })

  test('rejects when caller would be left without a role', async () => {
    const payload = {
      find: async () => ({ docs: [{ id: ROOT_ROLE_ID, name: ROOT_ROLE_NAME }] }),
      findByID: async (args: { id: string }) => {
        if (args.id === 'actor') return userDoc('actor', [ROOT_ROLE_ID])
        if (args.id === 'target') return userDoc('target', [EDITOR_ROLE_ID])
        return null
      },
      update: async () => ({}),
    } as unknown as Payload

    const transferRoot = createTransferRoot(mockHost(payload))
    await expect(
      transferRoot({
        targetUserId: 'target',
        actor: { type: 'human', userId: 'actor' },
      })
    ).rejects.toThrow(/another role/)
  })

  test('rejects non-root caller', async () => {
    const payload = {
      find: async () => ({ docs: [{ id: ROOT_ROLE_ID, name: ROOT_ROLE_NAME }] }),
      findByID: async (args: { id: string }) => {
        if (args.id === 'actor') return userDoc('actor', [EDITOR_ROLE_ID])
        if (args.id === 'target') return userDoc('target', [EDITOR_ROLE_ID])
        return null
      },
      update: async () => ({}),
    } as unknown as Payload

    const transferRoot = createTransferRoot(mockHost(payload))
    await expect(
      transferRoot({
        targetUserId: 'target',
        actor: { type: 'human', userId: 'actor' },
      })
    ).rejects.toThrow(/Only Root/)
  })

  test('restores actor Root if promoting target fails after demotion', async () => {
    const updates: Array<{ id: string; roles: string[] }> = []
    let promoteAttempts = 0

    const payload = {
      find: async () => ({ docs: [{ id: ROOT_ROLE_ID, name: ROOT_ROLE_NAME }] }),
      findByID: async (args: { id: string }) => {
        if (args.id === 'actor') return userDoc('actor', [ROOT_ROLE_ID, EDITOR_ROLE_ID])
        if (args.id === 'target') return userDoc('target', [EDITOR_ROLE_ID])
        return null
      },
      update: async (args: { id: string; data: { roles: string[] } }) => {
        updates.push({ id: String(args.id), roles: [...args.data.roles] })
        if (args.id === 'target') {
          promoteAttempts += 1
          if (promoteAttempts === 1) throw new Error('promote failed')
        }
        return {}
      },
    } as unknown as Payload

    const transferRoot = createTransferRoot(mockHost(payload))
    await expect(
      transferRoot({
        targetUserId: 'target',
        actor: { type: 'human', userId: 'actor' },
      })
    ).rejects.toThrow(/promote failed/)

    // demote actor → promote target fails → restore actor Root (ids sorted)
    expect(updates).toEqual([
      { id: 'actor', roles: [EDITOR_ROLE_ID] },
      { id: 'target', roles: [EDITOR_ROLE_ID, ROOT_ROLE_ID] },
      { id: 'actor', roles: [EDITOR_ROLE_ID, ROOT_ROLE_ID] },
    ])
  })
})
