import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomBytes } from 'node:crypto'
import {
  createEditorRole,
  createRbacIntPayload,
  intDatabaseConfigured,
  type RbacIntHandle,
} from '../../helpers/rbac-int-payload'

describe.skipIf(!intDatabaseConfigured)('createSharedUser concurrency (postgres)', () => {
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

  it('same idempotencyKey yields one user and consistent id', async () => {
    const api = handle.payload.iam.api
    const roleId = await createEditorRole(handle.payload)
    const idempotencyKey = `idem-${randomBytes(8).toString('hex')}`
    const email = `provision-${randomBytes(4).toString('hex')}@rbac-int.test`

    const [a, b] = await Promise.allSettled([
      api.createSharedUser({
        email,
        fullName: 'Provisioned User',
        roleIds: [roleId],
        actor: { type: 'system', reason: 'int-test' },
        idempotencyKey,
        skipInvite: true,
      }),
      api.createSharedUser({
        email,
        fullName: 'Provisioned User',
        roleIds: [roleId],
        actor: { type: 'system', reason: 'int-test' },
        idempotencyKey,
        skipInvite: true,
      }),
    ])

    const ids = new Set<string>()
    for (const result of [a, b]) {
      if (result.status === 'fulfilled') {
        ids.add(result.value.id)
      }
    }
    expect(ids.size).toBe(1)

    const users = await handle.payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    })
    expect(users.totalDocs).toBe(1)

    const user = users.docs[0] as {
      provisioningStatus?: string
      isActive?: boolean
      roles?: string[]
    }
    expect(user.provisioningStatus).toBe('none')
    expect(user.isActive).toBe(true)
    expect(user.roles?.map(String)).toContain(roleId)
  })
})
