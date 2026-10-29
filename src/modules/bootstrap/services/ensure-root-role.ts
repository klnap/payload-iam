import type { Payload } from 'payload'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { ROOT_PERMISSIONS, ROOT_ROLE_NAME } from '#iam/modules/bootstrap/config/root'

export type EnsureRootResult = {
  id: string
  created: boolean
}

async function withBootstrap<T>(fn: () => Promise<T>): Promise<T> {
  return runWithInternalOperation({ kind: 'BOOTSTRAP' }, fn)
}

/** Idempotent: exactly one role named Root. */
export async function ensureRootRole(payload: Payload): Promise<EnsureRootResult> {
  const found = await payload.find({
    collection: 'roles',
    where: { name: { equals: ROOT_ROLE_NAME } },
    limit: 2,
    depth: 0,
    overrideAccess: true,
  })

  if (found.docs.length > 1) {
    throw new Error(`payload-iam: multiple "${ROOT_ROLE_NAME}" roles — fix DB (exactly one)`)
  }

  if (found.docs[0]) {
    return { id: String(found.docs[0].id), created: false }
  }

  const id = await withBootstrap(async () => {
    const created = await payload.create({
      collection: 'roles',
      data: {
        name: ROOT_ROLE_NAME,
        permissions: { ...ROOT_PERMISSIONS },
      },
      overrideAccess: true,
      context: { payloadRbacOp: 'BOOTSTRAP' },
    })
    return String(created.id)
  })

  return { id, created: true }
}
