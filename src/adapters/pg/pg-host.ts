import { createHash } from 'node:crypto'
import { Pool } from 'pg'
import type { AdvisoryLock } from '#iam/types/config'
import { orderAdvisoryLocks } from './locks'

type PgClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>
  release: () => void
}

export type PgPool = {
  connect: () => Promise<PgClient>
  query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>
  end?: () => Promise<void>
  options?: { connectionString?: string }
}

export function extractPool(payload: { db?: unknown }): PgPool {
  const db = payload.db as { pool?: PgPool } | null | undefined
  const pool = db?.pool
  if (!pool?.connect || !pool?.query) {
    throw new Error('payload-iam: requires @payloadcms/db-postgres (payload.db.pool missing)')
  }
  return pool
}

/**
 * Dedicated advisory-lock pool — MUST NOT be payload.db.pool
 * (locks must not share connections with Payload mutations).
 */
export function createDedicatedLockPool(payloadPool: PgPool): PgPool {
  const connectionString =
    payloadPool.options?.connectionString ??
    (typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined)
  if (!connectionString) {
    throw new Error('payload-iam: cannot create lockPool — missing connectionString / DATABASE_URL')
  }
  return new Pool({
    connectionString,
    max: 4,
    connectionTimeoutMillis: 5000,
  }) as unknown as PgPool
}

function lockKey(lock: AdvisoryLock): string {
  const material =
    lock.kind === 'EMAIL_PROVISION_GUARD'
      ? `email:${lock.email}`
      : lock.kind === 'USER_LIFECYCLE_GUARD'
        ? `user:${lock.userId}`
        : lock.kind === 'ROLE_GUARD'
          ? `role:${lock.roleId}`
          : 'root'
  const buf = createHash('sha256').update(material).digest()
  return (buf.readBigUInt64BE(0) & BigInt('0x7fffffffffffffff')).toString()
}

/**
 * Acquire xact advisory locks on lockPool, run fn, COMMIT (releases locks).
 * Model B: call once per Payload phase — NEVER hold across BA.
 */
export function createWithAdvisoryLocks(lockPool: PgPool) {
  return async function withAdvisoryLocks<T>(
    locks: readonly AdvisoryLock[],
    fn: () => Promise<T>
  ): Promise<T> {
    const ordered = orderAdvisoryLocks([...locks])
    const client = await lockPool.connect()
    try {
      await client.query('BEGIN')
      for (const lock of ordered) {
        await client.query('SELECT pg_advisory_xact_lock($1)', [lockKey(lock)])
      }
      const result = await fn()
      await client.query('COMMIT')
      return result
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // ignore rollback errors
      }
      throw err
    } finally {
      client.release()
    }
  }
}

export function createDbNow(pool: PgPool) {
  return async function dbNow(): Promise<Date> {
    const { rows } = await pool.query('SELECT NOW() AS now')
    return rows[0]!.now as Date
  }
}

/** Process-local rate limit (limitation only — not authz). */
const buckets = new Map<string, { count: number; resetAt: number }>()

export async function consumeRateLimit(args: {
  key: string
  limit: number
  windowMs: number
}): Promise<{ allowed: boolean }> {
  const now = Date.now()
  let bucket = buckets.get(args.key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + args.windowMs }
    buckets.set(args.key, bucket)
  }
  if (bucket.count >= args.limit) return { allowed: false }
  bucket.count += 1
  return { allowed: true }
}

function addOrigin(origins: Set<string>, value: string): void {
  if (!value || value === '*') return
  origins.add(value.replace(/\/$/, ''))
}

export function resolveTrustedOrigins(config: {
  serverURL?: string
  cors?: unknown
  csrf?: unknown
}): string[] {
  const origins = new Set<string>()
  if (config.serverURL) addOrigin(origins, config.serverURL)

  const cors = config.cors
  if (typeof cors === 'string') {
    addOrigin(origins, cors)
  } else if (Array.isArray(cors)) {
    for (const o of cors) if (typeof o === 'string') addOrigin(origins, o)
  } else if (cors && typeof cors === 'object' && 'origins' in cors) {
    const list = (cors as { origins: unknown }).origins
    if (typeof list === 'string') addOrigin(origins, list)
    else if (Array.isArray(list)) {
      for (const o of list) if (typeof o === 'string') addOrigin(origins, o)
    }
  }

  if (Array.isArray(config.csrf)) {
    for (const o of config.csrf) if (typeof o === 'string') addOrigin(origins, o)
  }

  if (origins.size === 0) {
    throw new Error('payload-iam: set serverURL (and optionally cors/csrf) on Payload config')
  }
  return [...origins]
}
