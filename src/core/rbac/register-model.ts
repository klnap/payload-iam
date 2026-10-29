import type { FieldOp, FieldPathEntry } from '#iam/core/permissions/shape'

const DEFAULT_REGISTER_OPS = ['read'] as const
function defaultFieldOpsForEntity(entityOps: readonly string[]): FieldOp[] {
  const out: FieldOp[] = []
  for (const op of entityOps) {
    if (op === 'create' || op === 'read' || op === 'update') {
      out.push(op)
    }
  }
  return out.length ? out : ['read']
}

/** One field row on a custom RBAC model (admin view / registered route). */
export type RbacModelFieldDef = {
  path: string
  label: string
  /** When false, update stays off (like Payload readOnly fields). */
  allowUpdate?: boolean
  /**
   * Matrix columns for this row only (create | read | update).
   * Default: model `fieldOps`. Use to omit create on a row, etc.
   */
  ops?: readonly FieldOp[]
}

/**
 * Full permission model for a custom admin surface.
 * Stored under `permissions.register[id]` with `ops` + optional `fields`.
 */
export type RbacPermissionModel = {
  id: string
  label: string
  /** Admin path for nav/docs, e.g. `/scheduled-events`. */
  path?: string
  /** Roles tab when using `iam({ models: [...] })`. Default `Custom`. */
  tab?: string
  /**
   * Entity-level matrix columns. Default `['read']` (view access).
   * Use `read` + `manage` / `update` / etc. when the surface has more gates.
   */
  ops?: readonly string[]
  /** Field matrix ops — subset applied when an entity op is also a field op. Default read+update. */
  fieldOps?: readonly FieldOp[]
  fields?: readonly RbacModelFieldDef[]
}

export type NormalizedRbacRegisterItem = {
  id: string
  label: string
  path?: string
  ops: readonly string[]
  fieldOps: readonly FieldOp[]
  fields: FieldPathEntry[]
}

function assertId(id: string, ctx: string): void {
  if (!id || typeof id !== 'string' || !id.trim()) {
    throw new Error(`rbac: ${ctx} id required`)
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(id)) {
    throw new Error(
      `rbac: ${ctx} id "${id}" must be alphanumeric (dots/dashes ok) — stable permissions.register key`
    )
  }
}

function assertLabel(label: string, ctx: string): void {
  if (!label || typeof label !== 'string' || !label.trim()) {
    throw new Error(`rbac: ${ctx} label required`)
  }
}

export function fieldMatrixOps(
  field: FieldPathEntry,
  modelFieldOps: readonly FieldOp[]
): FieldOp[] {
  const base = field.ops?.length ? [...field.ops] : [...modelFieldOps]
  if (field.allowUpdate === false) {
    return base.filter((op) => op === 'read' && modelFieldOps.includes(op))
  }
  return base.filter((op) => modelFieldOps.includes(op))
}

function normalizeFieldDefs(
  fields: readonly RbacModelFieldDef[] | undefined,
  modelFieldOps: readonly FieldOp[],
  entityOps: readonly string[],
  ctx: string
): FieldPathEntry[] {
  if (!fields?.length) return []
  const seen = new Set<string>()
  const out: FieldPathEntry[] = []
  for (const f of fields) {
    if (!f?.path?.trim()) {
      throw new Error(`rbac: ${ctx} field.path required`)
    }
    if (!f.label?.trim()) {
      throw new Error(`rbac: ${ctx} field "${f.path}" label required`)
    }
    if (seen.has(f.path)) {
      throw new Error(`rbac: ${ctx} duplicate field path "${f.path}"`)
    }
    seen.add(f.path)
    let rowOps: FieldOp[] | undefined
    if (f.ops?.length) {
      rowOps = []
      for (const op of f.ops) {
        if (op !== 'create' && op !== 'read' && op !== 'update') {
          throw new Error(`rbac: ${ctx} field "${f.path}" ops must be create|read|update`)
        }
        if (!entityOps.includes(op)) {
          throw new Error(
            `rbac: ${ctx} field "${f.path}" op "${op}" must exist on model ops (parent row)`
          )
        }
        if (!modelFieldOps.includes(op)) {
          throw new Error(
            `rbac: ${ctx} field "${f.path}" op "${op}" must be included in model fieldOps`
          )
        }
        rowOps.push(op)
      }
    }
    if (f.allowUpdate === false && rowOps?.includes('update')) {
      throw new Error(`rbac: ${ctx} field "${f.path}" cannot list update when allowUpdate is false`)
    }
    out.push({
      path: f.path,
      label: f.label,
      allowUpdate: f.allowUpdate,
      ops: rowOps,
    })
  }
  return out
}

function normalizeOps(ops: readonly string[] | undefined, ctx: string): readonly string[] {
  const list = ops?.length ? [...ops] : [...DEFAULT_REGISTER_OPS]
  const seen = new Set<string>()
  for (const op of list) {
    if (!op || typeof op !== 'string' || !op.trim()) {
      throw new Error(`rbac: ${ctx} op must be a non-empty string`)
    }
    if (seen.has(op)) {
      throw new Error(`rbac: ${ctx} duplicate op "${op}"`)
    }
    seen.add(op)
  }
  return list
}

function normalizeFieldOps(
  fieldOps: readonly FieldOp[] | undefined,
  entityOps: readonly string[],
  ctx: string
): readonly FieldOp[] {
  const list = fieldOps?.length ? [...fieldOps] : defaultFieldOpsForEntity(entityOps)
  for (const op of list) {
    if (op !== 'create' && op !== 'read' && op !== 'update') {
      throw new Error(`rbac: ${ctx} fieldOps must be create|read|update`)
    }
    if (!entityOps.includes(op)) {
      throw new Error(
        `rbac: ${ctx} fieldOp "${op}" must also appear in ops (field matrix inherits entity ops)`
      )
    }
  }
  return list
}

/** Validate and freeze a reusable model (export from feature packages). */
export function defineRbacModel(model: RbacPermissionModel): RbacPermissionModel {
  const ctx = `model "${model.id}"`
  assertId(model.id, ctx)
  assertLabel(model.label, ctx)
  const ops = normalizeOps(model.ops, ctx)
  const fieldOps = normalizeFieldOps(model.fieldOps, ops, ctx)
  normalizeFieldDefs(model.fields, fieldOps, ops, ctx)
  return {
    ...model,
    ops,
    fieldOps,
  }
}

export function normalizeRbacRegisterItem(
  item: RbacPermissionModel,
  tabLabel: string
): NormalizedRbacRegisterItem {
  const ctx = `register tab "${tabLabel}" item "${item.id}"`
  assertId(item.id, ctx)
  assertLabel(item.label, ctx)
  const ops = normalizeOps(item.ops, ctx)
  const fieldOps = normalizeFieldOps(item.fieldOps, ops, ctx)
  const fields = normalizeFieldDefs(item.fields, fieldOps, ops, ctx)
  return {
    id: item.id,
    label: item.label,
    path: item.path,
    ops,
    fieldOps,
    fields,
  }
}

export function unionRegisterTabOps(items: NormalizedRbacRegisterItem[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    for (const op of item.ops) {
      if (!seen.has(op)) {
        seen.add(op)
        out.push(op)
      }
    }
  }
  return out
}
