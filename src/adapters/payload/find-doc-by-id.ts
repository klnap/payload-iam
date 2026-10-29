import type { HostPayload } from './payload-host'

function isPayloadNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const status = (error as { status?: number }).status
  if (status === 404) return true
  const name = (error as { name?: string }).name
  return name === 'NotFound'
}

/** Payload 3.x `findByID` throws NotFound — use when absence is valid. */
export async function findDocById<T extends Record<string, unknown> = Record<string, unknown>>(
  payload: HostPayload,
  args: {
    collection: string
    id: string
    depth?: number
  }
): Promise<T | null> {
  try {
    const doc = await payload.findByID({
      collection: args.collection,
      id: args.id,
      depth: args.depth ?? 0,
      overrideAccess: true,
    })
    return doc as T
  } catch (error) {
    if (isPayloadNotFound(error)) return null
    throw error
  }
}
