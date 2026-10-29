import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { randomBytes } from 'node:crypto'
import { BA_ADMIN_SESSION_CHANNEL } from '../../../src/modules/auth/config/auth-channel'
import { ensureRootRole } from '../../../src/modules/bootstrap/services/ensure-root-role'
import {
  createRbacIntPayload,
  intDatabaseConfigured,
  type RbacIntHandle,
} from '../../helpers/rbac-int-payload'
import {
  type CollectionOp,
  PERMISSION_MATRIX_CASES,
  type PermissionMatrixCase,
} from './permission-matrix.cases'

async function rootRoleId(handle: RbacIntHandle): Promise<string> {
  const { id } = await ensureRootRole(handle.payload)
  return id
}

async function humanForCase(
  handle: RbacIntHandle,
  matrixCase: PermissionMatrixCase
): Promise<Record<string, unknown> | null> {
  if (matrixCase.session === 'anon') return null
  if (matrixCase.asRoot || matrixCase.session === 'root') {
    const roleId = await rootRoleId(handle)
    const email = `root-${randomBytes(3).toString('hex')}@rbac-int.test`
    const created = await handle.payload.iam.api.createSharedUser({
      email,
      fullName: 'Root',
      roleIds: [roleId],
      actor: { type: 'system', reason: 'matrix-int' },
      skipInvite: true,
    })
    const doc = await handle.payload.findByID({
      collection: 'users',
      id: created.id,
      depth: 1,
      overrideAccess: true,
    })
    return {
      ...(doc as Record<string, unknown>),
      authChannel: BA_ADMIN_SESSION_CHANNEL,
      isActive: true,
    }
  }

  const role = await handle.payload.create({
    collection: 'roles',
    data: {
      name: `Matrix-${randomBytes(3).toString('hex')}`,
      permissions: {
        collections: matrixCase.grants ?? {},
        globals: {},
        register: {},
      },
    },
    overrideAccess: true,
  })
  const email = `u-${randomBytes(4).toString('hex')}@rbac-int.test`
  const created = await handle.payload.iam.api.createSharedUser({
    email,
    fullName: 'Matrix User',
    roleIds: [String(role.id)],
    actor: { type: 'system', reason: 'matrix-int' },
    skipInvite: true,
  })
  const doc = await handle.payload.findByID({
    collection: 'users',
    id: created.id,
    depth: 1,
    overrideAccess: true,
  })
  return {
    ...(doc as Record<string, unknown>),
    authChannel: BA_ADMIN_SESSION_CHANNEL,
    isActive: true,
  }
}

async function seedDoc(handle: RbacIntHandle, slug: string): Promise<string> {
  if (slug === 'articles' || slug === 'pages') {
    const doc = await handle.payload.create({
      collection: slug,
      data: { title: 'Seed' },
      overrideAccess: true,
    })
    return String(doc.id)
  }
  if (slug === 'users') {
    const viewerRole = await handle.payload.create({
      collection: 'roles',
      data: {
        name: `Viewer-${randomBytes(3).toString('hex')}`,
        permissions: { collections: {}, globals: {}, register: {} },
      },
      overrideAccess: true,
    })
    const u = await handle.payload.iam.api.createSharedUser({
      email: `target-${randomBytes(3).toString('hex')}@rbac-int.test`,
      fullName: 'Target',
      roleIds: [String(viewerRole.id)],
      actor: { type: 'system', reason: 'matrix-int' },
      skipInvite: true,
    })
    return u.id
  }
  const role = await handle.payload.create({
    collection: 'roles',
    data: {
      name: `R-${randomBytes(3).toString('hex')}`,
      permissions: { collections: {}, globals: {}, register: {} },
    },
    overrideAccess: true,
  })
  return String(role.id)
}

async function runOp(
  handle: RbacIntHandle,
  matrixCase: PermissionMatrixCase,
  user: Record<string, unknown> | null,
  docId: string
): Promise<void> {
  const { slug, op } = matrixCase
  const base = { user, overrideAccess: false as const }
  switch (op) {
    case 'read':
      await handle.payload.findByID({ collection: slug, id: docId, ...base })
      return
    case 'create':
      await handle.payload.create({
        collection: slug,
        data:
          slug === 'roles'
            ? {
                name: `New-${randomBytes(3).toString('hex')}`,
                permissions: { collections: {}, globals: {}, register: {} },
              }
            : { title: 'New' },
        ...base,
      })
      return
    case 'update':
      await handle.payload.update({
        collection: slug,
        id: docId,
        data:
          slug === 'roles'
            ? { name: `Upd-${randomBytes(3).toString('hex')}` }
            : { title: 'Updated' },
        ...base,
      })
      return
    case 'delete':
      await handle.payload.delete({ collection: slug, id: docId, ...base })
      return
    default:
      throw new Error(`unknown op ${op satisfies CollectionOp}`)
  }
}

describe.skipIf(!intDatabaseConfigured)('permission matrix (parameterized integration)', () => {
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

  for (const matrixCase of PERMISSION_MATRIX_CASES) {
    const label = `${matrixCase.slug}.${matrixCase.op}.${matrixCase.session}.${matrixCase.expect}`
    it(label, async () => {
      const user = await humanForCase(handle, matrixCase)
      const docId = await seedDoc(handle, matrixCase.slug)
      const run = () => runOp(handle, matrixCase, user, docId)
      if (matrixCase.expect === 'allow') {
        await expect(run()).resolves.toBeUndefined()
      } else {
        await expect(run()).rejects.toThrow()
      }
    })
  }
})
