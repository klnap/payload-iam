import { createHash, timingSafeEqual } from 'node:crypto'
import type { HostRuntimeDeps, ServiceTokenRecord } from '#iam/types/config'
import type { ServicePrincipal } from '#iam/types/service-principal'

export type { ServicePrincipal } from '#iam/types/service-principal'

const HEADER = 'x-payload-service-token'

function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

function matchToken(
  raw: string,
  records: ServiceTokenRecord[],
  now: Date
): ServiceTokenRecord | null {
  const digest = hashToken(raw)
  for (const rec of records) {
    if (!rec.active) continue
    if (rec.expiresAt && rec.expiresAt.getTime() <= now.getTime()) continue
    if (safeEqualHex(digest, rec.hash)) return rec
  }
  return null
}

/**
 * Call before Payload. Returns:
 * - null → no service header (continue normal auth)
 * - Response 401 → bad token (stop)
 * - ServicePrincipal → attach in strategy
 *
 * Bearer never equals service auth.
 * Both Authorization Bearer + service header → 401 deterministic.
 */
export function createPrePayloadServiceAuth(host: HostRuntimeDeps) {
  return async function prePayloadServiceAuth(
    request: Request
  ): Promise<ServicePrincipal | Response | null> {
    const serviceRaw = request.headers.get(HEADER)
    const authz = request.headers.get('authorization')
    const hasBearer = Boolean(authz?.toLowerCase().startsWith('bearer '))

    if (!serviceRaw) return null

    if (hasBearer) {
      return new Response('Unauthorized', { status: 401 })
    }

    const now = await host.dbNow()
    const matched = matchToken(serviceRaw, host.serviceTokens, now)
    if (!matched) {
      return new Response('Unauthorized', { status: 401 })
    }

    const principal: ServicePrincipal = {
      id: `service:${matched.id}`,
      collection: 'users',
      type: 'service',
      email: `service:${matched.id}@internal`,
      emailVerified: true,
      isActive: true,
      canAccessAdmin: false,
      createdAt: now,
      updatedAt: now,
    }
    return principal
  }
}

export function hashServiceToken(raw: string): string {
  return hashToken(raw)
}
