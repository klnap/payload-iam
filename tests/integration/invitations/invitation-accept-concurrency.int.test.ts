import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { extractPool } from '../../../src/adapters/pg/pg-host'
import {
  createEditorRole,
  createRbacIntPayload,
  intDatabaseConfigured,
  type RbacIntHandle,
} from '../../helpers/rbac-int-payload'

function parseInviteToken(inviteUrl: string): string {
  const token = new URL(inviteUrl).searchParams.get('token')
  if (!token) throw new Error('inviteUrl missing token')
  return token
}

describe.skipIf(!intDatabaseConfigured)('acceptInvite concurrency (postgres)', () => {
  let handle: RbacIntHandle

  beforeAll(async () => {
    handle = await createRbacIntPayload()
  })

  afterAll(async () => {
    await handle?.destroy()
  })

  beforeEach(async () => {
    await handle.reset()
  })

  it('only one concurrent accept succeeds for the same invitation token', async () => {
    const api = handle.payload.iam.api
    const roleId = await createEditorRole(handle.payload)
    const email = `invite-${randomBytes(4).toString('hex')}@rbac-int.test`
    const password = 'Cc3!cccccccccc'

    const issued = await api.createSharedUser({
      email,
      fullName: 'Invitee',
      roleIds: [roleId],
      actor: { type: 'system', reason: 'int-test' },
    })
    expect(issued.invitationId).toBeDefined()
    expect(issued.inviteUrl).toBeDefined()

    const invitationId = issued.invitationId!
    const token = parseInviteToken(issued.inviteUrl!)

    const [a, b] = await Promise.allSettled([
      api.acceptInvite({ invitationId, token, password }),
      api.acceptInvite({ invitationId, token, password }),
    ])

    let successCount = 0
    let userId = ''
    for (const result of [a, b]) {
      if (result.status !== 'fulfilled') continue
      const value = result.value as { status?: boolean; userId?: string; error?: string }
      if (value.status === true) {
        successCount += 1
        userId = value.userId ?? userId
      }
    }
    // Winner + late arriver that sees already-accepted may both report status:true (idempotent).
    expect(successCount).toBeGreaterThanOrEqual(1)
    expect(successCount).toBeLessThanOrEqual(2)
    expect(userId.length).toBeGreaterThan(0)

    const invitation = await handle.payload.findByID({
      collection: 'invitations',
      id: invitationId,
      depth: 0,
      overrideAccess: true,
    })
    expect((invitation as { status?: string }).status).toBe('accepted')

    const afterAccept = (await handle.payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
      overrideAccess: true,
    })) as { provisioningStatus?: string; isActive?: boolean }
    expect(afterAccept.provisioningStatus).toBe('none')
    expect(afterAccept.isActive).toBe(true)

    const pool = extractPool(handle.payload)
    const accounts = await pool.query(
      `SELECT COUNT(*)::int AS count FROM auth."account" WHERE "userId" = $1 AND "providerId" = 'credential'`,
      [userId]
    )
    const count = (accounts as { rows: Array<{ count: number }> }).rows[0]?.count ?? 0
    expect(count).toBe(1)
  })
})
