import type { RolePermissions } from './role-permissions'
import type { PermissionsValue } from './shape'

type FieldsMap = Record<string, Record<string, boolean | undefined> | undefined> | undefined

export type PermEntity =
  | NonNullable<NonNullable<RolePermissions['collections']>[string]>
  | NonNullable<NonNullable<RolePermissions['globals']>[string]>
  | NonNullable<NonNullable<RolePermissions['register']>[string]>

function trueOps(map: PermEntity | undefined): string[] {
  if (!map) return []
  return Object.entries(map)
    .filter(([k, v]) => k !== 'fields' && v === true)
    .map(([k]) => k)
}

function fieldsSubset(subject: FieldsMap, ceiling: FieldsMap): boolean {
  if (!subject) return true
  for (const [path, ops] of Object.entries(subject)) {
    if (!ops) continue
    for (const [op, on] of Object.entries(ops)) {
      if (on === true && ceiling?.[path]?.[op] !== true) return false
    }
  }
  return true
}

function entitySubset(subject: PermEntity | undefined, ceiling: PermEntity | undefined): boolean {
  if (!subject) return true
  const ceilingOps = ceiling as Record<string, boolean | undefined> | undefined
  for (const op of trueOps(subject)) {
    if (ceilingOps?.[op] !== true) return false
  }
  return fieldsSubset(
    (subject as { fields?: FieldsMap }).fields,
    (ceiling as { fields?: FieldsMap } | undefined)?.fields
  )
}

/**
 * True when every granted flag in `subject` is also granted in `ceiling`.
 * Root callers should skip this check (no ceiling).
 */
export function isPermissionsSubset(
  subject: PermissionsValue | RolePermissions | null | undefined,
  ceiling: PermissionsValue | RolePermissions | null | undefined
): boolean {
  if (!subject) return true
  if (!ceiling) return false

  for (const [slug, row] of Object.entries(subject.collections ?? {})) {
    if (!entitySubset(row, ceiling.collections?.[slug])) return false
  }
  for (const [slug, row] of Object.entries(subject.globals ?? {})) {
    if (!entitySubset(row, ceiling.globals?.[slug])) return false
  }

  const subjectRegister = (subject as PermissionsValue).register
  const ceilingRegister = (ceiling as PermissionsValue).register
  for (const [id, row] of Object.entries(subjectRegister ?? {})) {
    if (!entitySubset(row, ceilingRegister?.[id])) return false
  }

  return true
}

/** Collection/global visible on matrix when caller has ≥1 op on it. */
export function entityHasAnyOp(row: PermEntity | undefined): boolean {
  return trueOps(row).length > 0
}

export function opAllowed(
  ceiling: PermissionsValue | RolePermissions | 'root' | null | undefined,
  kind: 'collections' | 'globals' | 'register',
  id: string,
  op: string
): boolean {
  if (ceiling === 'root') return true
  if (!ceiling) return false
  if (kind === 'register') {
    const reg = (ceiling as PermissionsValue).register
    return reg?.[id]?.[op as 'read'] === true
  }
  const bucket = ceiling[kind] as Record<string, PermEntity> | undefined
  const row = bucket?.[id] as Record<string, boolean | undefined> | undefined
  return row?.[op] === true
}
