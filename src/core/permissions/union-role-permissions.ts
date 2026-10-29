import type { RolePermissions } from './role-permissions'

const POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function isSafeKey(key: string): boolean {
  return !POLLUTION_KEYS.has(key)
}

/** Grant if any role grants (`true`); explicit `false` only when no role grants. */
function mergeOpGrant(a?: boolean, b?: boolean): boolean | undefined {
  if (a === true || b === true) return true
  if (a === false || b === false) return false
  return undefined
}

type FieldOps = Partial<Record<'create' | 'read' | 'update', boolean>>

function mergeFieldOps(a?: FieldOps, b?: FieldOps): FieldOps | undefined {
  if (!a) return b
  if (!b) return a
  const out: FieldOps = {}
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if (!isSafeKey(key)) continue
    const merged = mergeOpGrant(a[key as keyof FieldOps], b[key as keyof FieldOps])
    if (merged !== undefined) out[key as keyof FieldOps] = merged
  }
  return Object.keys(out).length > 0 ? out : undefined
}

type EntityOps = Record<string, boolean | FieldOps | undefined> & {
  fields?: Record<string, FieldOps | undefined>
}

function mergeEntityOps(a?: EntityOps, b?: EntityOps): EntityOps | undefined {
  if (!a) return b
  if (!b) return a
  const out: EntityOps = {}
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if (!isSafeKey(key)) continue
    if (key === 'fields') {
      const mergedFields = mergeFieldsMap(a.fields, b.fields)
      if (mergedFields) out.fields = mergedFields
      continue
    }
    const merged = mergeOpGrant(a[key] as boolean | undefined, b[key] as boolean | undefined)
    if (merged !== undefined) out[key] = merged
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function mergeFieldsMap(
  a?: Record<string, FieldOps | undefined>,
  b?: Record<string, FieldOps | undefined>
): Record<string, FieldOps | undefined> | undefined {
  if (!a) return b
  if (!b) return a
  const out: Record<string, FieldOps | undefined> = {}
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const path of keys) {
    if (!isSafeKey(path)) continue
    const merged = mergeFieldOps(a[path], b[path])
    if (merged) out[path] = merged
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function mergePermissionMaps(
  base: Record<string, EntityOps | undefined> | undefined,
  next: Record<string, EntityOps | undefined> | undefined
): Record<string, EntityOps | undefined> | undefined {
  if (!next) return base
  if (!base) return { ...next }
  const out: Record<string, EntityOps | undefined> = { ...base }
  for (const [slug, ops] of Object.entries(next)) {
    if (!isSafeKey(slug)) continue
    out[slug] = mergeEntityOps(out[slug], ops)
  }
  return out
}

/** Union role permission objects (order-independent OR semantics for grants). */
export function unionRolePermissions(
  base: RolePermissions,
  next: RolePermissions
): RolePermissions {
  const out: RolePermissions = {
    collections: mergePermissionMaps(
      base.collections,
      next.collections
    ) as RolePermissions['collections'],
    globals: mergePermissionMaps(base.globals, next.globals) as RolePermissions['globals'],
    register: mergePermissionMaps(base.register, next.register) as RolePermissions['register'],
  }
  if (!out.collections) delete out.collections
  if (!out.globals) delete out.globals
  if (!out.register) delete out.register
  return out
}
