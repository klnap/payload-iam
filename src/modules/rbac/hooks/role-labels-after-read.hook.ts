import type { FieldHook } from 'payload'

function roleIdsFrom(raw: unknown): string[] {
  if (raw == null) return []
  const items = Array.isArray(raw) ? raw : [raw]
  return items.flatMap((item) => {
    if (item == null) return []
    if (typeof item === 'string' || typeof item === 'number') {
      return [String(item)]
    }
    if (typeof item === 'object' && 'id' in item && item.id != null) {
      return [String(item.id)]
    }
    return []
  })
}

function namesFromPopulated(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  if (raw.every((r) => r && typeof r === 'object' && 'name' in r)) {
    return raw.map((r) => String((r as { name: unknown }).name))
  }
  return null
}

/** Resolve role names server-side (overrideAccess — includes Root Admin). */
export const roleLabelsAfterRead: FieldHook = async ({ data, req }) => {
  const raw = data?.roles
  const populated = namesFromPopulated(raw)
  if (populated) return populated.join(', ') || '—'

  const ids = roleIdsFrom(raw)
  if (ids.length === 0) return '—'

  const { docs } = await req.payload.find({
    collection: 'roles',
    where: { id: { in: ids } },
    depth: 0,
    limit: ids.length,
    overrideAccess: true,
  })
  const byId = new Map(
    docs.map((d) => [String(d.id), String((d as { name?: string }).name ?? d.id)])
  )
  return ids.map((id) => byId.get(id) ?? id).join(', ') || '—'
}
