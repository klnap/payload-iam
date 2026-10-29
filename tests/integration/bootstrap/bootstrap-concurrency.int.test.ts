import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { bootstrapRoot } from '../../../src/modules/bootstrap/services/bootstrap-root'
import { hasRoot } from '../../../src/modules/bootstrap/services/has-root'
import {
  createRbacIntPayload,
  intDatabaseConfigured,
  type RbacIntHandle,
} from '../../helpers/rbac-int-payload'

describe.skipIf(!intDatabaseConfigured)('bootstrapRoot concurrency (postgres)', () => {
  let handle: RbacIntHandle

  beforeAll(async () => {
    handle = await createRbacIntPayload()
  })

  afterAll(async () => {
    await handle?.destroy()
  })

  beforeEach(async () => {
    await handle.reset()
    expect(await hasRoot(handle.payload)).toBe(false)
  })

  it('allows only one root when two bootstraps race on different emails', async () => {
    const password = 'Aa1!aaaaaaaaaa'
    const [first, second] = await Promise.allSettled([
      bootstrapRoot(handle.payload, {
        email: 'root-a@rbac-int.test',
        password,
        fullName: 'Root A',
      }),
      bootstrapRoot(handle.payload, {
        email: 'root-b@rbac-int.test',
        password: 'Bb2!bbbbbbbbbb',
        fullName: 'Root B',
      }),
    ])

    const fulfilled = [first, second].filter((r) => r.status === 'fulfilled')
    const rejected = [first, second].filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    const err = rejected[0] as PromiseRejectedResult
    expect(String(err.reason)).toContain('already exists')

    const rootRoles = await handle.payload.find({
      collection: 'roles',
      where: { name: { equals: 'Root' } },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    })
    expect(rootRoles.docs).toHaveLength(1)

    const rootRoleId = String(rootRoles.docs[0]!.id)
    const holders = await handle.payload.find({
      collection: 'users',
      where: { roles: { equals: rootRoleId } },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    })
    expect(holders.totalDocs).toBe(1)
    expect(await hasRoot(handle.payload)).toBe(true)
  })
})
