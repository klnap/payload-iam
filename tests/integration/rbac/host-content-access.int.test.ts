import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { BA_ADMIN_SESSION_CHANNEL } from '../../../src/modules/auth/config/auth-channel'
import {
  createRbacIntPayload,
  intDatabaseConfigured,
  type RbacIntHandle,
} from '../../helpers/rbac-int-payload'

describe.skipIf(!intDatabaseConfigured)('host collection + field RBAC (postgres)', () => {
  let handle: RbacIntHandle
  let articleId: string
  let limitedUser: Record<string, unknown>

  beforeAll(async () => {
    handle = await createRbacIntPayload()
  })

  afterAll(async () => {
    await handle?.destroy()
  })

  beforeEach(async () => {
    await handle.reset()

    const role = await handle.payload.create({
      collection: 'roles',
      data: {
        name: `ArticleReader-${randomBytes(3).toString('hex')}`,
        permissions: {
          collections: {
            articles: {
              read: true,
              update: true,
              fields: {
                title: { read: true, update: true },
                body: { read: true, update: false },
                secret: { read: false, update: false },
              },
            },
          },
          globals: {},
          register: {},
        },
      },
      overrideAccess: true,
    })

    const email = `reader-${randomBytes(4).toString('hex')}@rbac-int.test`
    const created = await handle.payload.iam.api.createSharedUser({
      email,
      fullName: 'Reader',
      roleIds: [String(role.id)],
      actor: { type: 'system', reason: 'int-test' },
      skipInvite: true,
    })

    const userDoc = await handle.payload.findByID({
      collection: 'users',
      id: created.id,
      depth: 1,
      overrideAccess: true,
    })

    limitedUser = {
      ...(userDoc as Record<string, unknown>),
      authChannel: BA_ADMIN_SESSION_CHANNEL,
      isActive: true,
    }

    const article = await handle.payload.create({
      collection: 'articles',
      data: {
        title: 'Hello',
        body: 'Body text',
        secret: 'top-secret',
      },
      overrideAccess: true,
    })
    articleId = String(article.id)
  })

  it('collection create/delete denied without matrix grant', async () => {
    await expect(
      handle.payload.create({
        collection: 'articles',
        data: { title: 'Nope' },
        user: limitedUser,
        overrideAccess: false,
      })
    ).rejects.toThrow()

    await expect(
      handle.payload.delete({
        collection: 'articles',
        id: articleId,
        user: limitedUser,
        overrideAccess: false,
      })
    ).rejects.toThrow()
  })

  it('collection read allowed; field-level update strips denied fields', async () => {
    const found = await handle.payload.findByID({
      collection: 'articles',
      id: articleId,
      user: limitedUser,
      overrideAccess: false,
    })
    expect(found.title).toBe('Hello')
    expect(found.body).toBe('Body text')
    expect(found.secret).toBeUndefined()

    const updated = await handle.payload.update({
      collection: 'articles',
      id: articleId,
      data: {
        title: 'Renamed',
        body: 'Should not stick',
        secret: 'hacked',
      },
      user: limitedUser,
      overrideAccess: false,
    })
    expect(updated.title).toBe('Renamed')
    expect(updated.body).toBe('Body text')

    const raw = await handle.payload.findByID({
      collection: 'articles',
      id: articleId,
      overrideAccess: true,
    })
    expect(raw.secret).toBe('top-secret')
  })

  it('anonymous cannot read host content (fail-closed)', async () => {
    await expect(
      handle.payload.findByID({
        collection: 'articles',
        id: articleId,
        user: null,
        overrideAccess: false,
      })
    ).rejects.toThrow()
  })
})
