import type { RolePermissions } from '#iam/core/permissions/role-permissions'
import type { FieldOp, GlobalOp } from '#iam/core/permissions/shape'
import { opAllowed } from '#iam/core/permissions/subset'
import { type DraftsConfigSource, hasDraftsEnabled } from '#iam/core/rbac/drafts-enabled'

/**
 * Field columns — which fields may be changed (`fields[path].update`).
 * Requires parent entity `update`.
 */
/** Field rows — `create` gates array/block rows; parent entity is always `update` (no global create). */
export const GLOBAL_MATRIX_FIELD_OPS: readonly FieldOp[] = ['create', 'read', 'update']

const GLOBAL_BASE_OPS: readonly GlobalOp[] = ['read', 'update']

export type GlobalMatrixConfigSource = DraftsConfigSource

export type GlobalPermRow = Partial<Record<GlobalOp, boolean>>

export const globalHasDraftsEnabled = hasDraftsEnabled

/**
 * Entity columns for one global:
 * - `update` — edit content / save draft / Save (when no drafts)
 * - `publish` — publish to live (only when drafts enabled); without it publish is denied
 */
export function globalEntityMatrixOps(global: GlobalMatrixConfigSource): GlobalOp[] {
  const ops: GlobalOp[] = [...GLOBAL_BASE_OPS]
  if (hasDraftsEnabled(global)) ops.push('publish')
  return ops
}

export function globalMatrixFrameOps(globals: GlobalMatrixConfigSource[]): string[] {
  const set = new Set<GlobalOp>()
  for (const g of globals) {
    for (const op of globalEntityMatrixOps(g)) set.add(op)
  }
  const ordered: GlobalOp[] = ['read', 'update', 'publish']
  const entityOps = ordered.filter((op) => set.has(op))
  return ['create', ...entityOps]
}

export function globalMatrixOpAllowed(
  ceiling: RolePermissions | 'root' | null | undefined,
  slug: string,
  op: GlobalOp
): boolean {
  return opAllowed(ceiling, 'globals', slug, op)
}

export function globalEntityGrantsFieldOp(
  row: GlobalPermRow | undefined,
  fieldOp: FieldOp
): boolean {
  if (fieldOp === 'read') return row?.read === true
  if (fieldOp === 'create' || fieldOp === 'update') return row?.update === true
  return false
}
