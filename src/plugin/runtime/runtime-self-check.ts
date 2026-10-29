import type { Payload } from 'payload'
import type { PgPool } from '#iam/adapters/pg/pg-host'

/**
 * Contract §22 — ANY failure → process MUST NOT run degraded.
 */
export function assertIamRuntimeSelfCheck(args: {
  payload: Payload
  payloadPool: PgPool
  lockPool: PgPool
  usersSlug?: string
  publishTargets?: readonly string[]
}): void {
  const usersSlug = args.usersSlug ?? 'users'
  if (args.lockPool === args.payloadPool) {
    throw new Error('payload-iam: lockPool MUST NOT be payload.db.pool')
  }

  const adapter = args.payload.db as {
    allowIDOnCreate?: boolean
  }
  if (adapter.allowIDOnCreate !== true) {
    throw new Error('payload-iam: postgresAdapter.allowIDOnCreate MUST be true')
  }

  for (const slug of [usersSlug, 'roles', 'invitations']) {
    const col = args.payload.collections[slug]
    if (!col) {
      throw new Error(`payload-iam: missing collection ${slug}`)
    }
    const versions = (col.config as { versions?: unknown }).versions
    if (versions !== false && versions != null) {
      throw new Error(`payload-iam: ${slug} MUST have versions: false`)
    }
  }

  const users = args.payload.collections[usersSlug]?.config
  const fieldNames = new Set<string>()
  for (const f of users?.fields ?? []) {
    if (f && typeof f === 'object' && 'name' in f && typeof f.name === 'string') {
      fieldNames.add(f.name)
    }
  }
  if (fieldNames.has('role')) {
    throw new Error('payload-iam: users must not define field "role" — use "roles"')
  }
  for (const req of [
    'fullName',
    'roles',
    'provisioningStatus',
    'provisioningOperationId',
    'isActive',
    'email',
  ]) {
    if (!fieldNames.has(req)) {
      throw new Error(`payload-iam: users missing field ${req}`)
    }
  }

  const targets = args.publishTargets ?? []
  for (const slug of targets) {
    const col = args.payload.collections[slug]
    if (!col) {
      throw new Error(`payload-iam: publishTarget ${slug} not found`)
    }
    if ((col.config as { versions?: unknown }).versions !== false) {
      throw new Error(`payload-iam: publishTarget ${slug} MUST versions:false`)
    }
  }
}
