import type {
  CollectionPerms,
  FieldOp,
  FieldPathEntry,
  GlobalPerms,
  PermissionsValue,
  RegisterPerms,
} from '#iam/core/permissions/shape'
import { fieldMatrixOps } from '#iam/core/rbac/register-model'
import { isDescendantFieldPath, parentFieldPath } from './matrix-field-tree'

type ModelBucket = 'collections' | 'globals' | 'register'
type ModelRow = CollectionPerms | GlobalPerms | RegisterPerms

export type ModelMatrixHandlers<TOp extends string> = {
  setOp: (op: TOp, on: boolean) => void
  setAll: (on: boolean) => void
  setField: (fp: string, op: FieldOp, on: boolean) => void
  setFieldAll: (fp: string, on: boolean) => void
}

export function createModelMatrixHandlers<TOp extends string>({
  perms,
  patch,
  bucket,
  slug,
  row,
  entityOps,
  fieldOps,
  fields,
  can,
}: {
  perms: PermissionsValue
  patch: (next: PermissionsValue) => void
  bucket: ModelBucket
  slug: string
  row: ModelRow
  entityOps: readonly TOp[]
  fieldOps: readonly FieldOp[]
  fields: FieldPathEntry[]
  can: (op: TOp) => boolean
}): ModelMatrixHandlers<TOp> {
  const opsForField = (fp: string): FieldOp[] =>
    fieldMatrixOps(fields.find((f) => f.path === fp) ?? { path: fp, label: fp }, fieldOps)

  const writeRow = (next: ModelRow) => {
    if (bucket === 'register') {
      const cur = { ...(perms.register ?? {}) }
      cur[slug] = next as RegisterPerms
      patch({ ...perms, register: cur })
      return
    }
    const cur = { ...(perms[bucket] ?? {}) }
    cur[slug] = next as CollectionPerms & GlobalPerms
    patch({ ...perms, [bucket]: cur })
  }

  const setOp = (op: TOp, on: boolean) => {
    if (on && !can(op)) return
    const next: ModelRow = { ...(row ?? {}) }
    next[op as keyof ModelRow] = on as never
    if (fieldOps.includes(op as FieldOp)) {
      const f = { ...(next.fields ?? {}) }
      for (const field of fields) {
        const { path: fp, allowUpdate } = field
        if (!opsForField(fp).includes(op as FieldOp)) continue
        if (op === 'update' && allowUpdate === false) continue
        f[fp] = { ...(f[fp] ?? {}), [op as FieldOp]: on }
      }
      next.fields = f
    }
    writeRow(next)
  }

  const setAll = (on: boolean) => {
    const next: ModelRow = { ...(row ?? {}) }
    for (const op of entityOps) {
      if (on && !can(op)) continue
      next[op as keyof ModelRow] = (on && can(op)) as never
    }
    if (!on) {
      next.fields = {}
    } else {
      const f: NonNullable<ModelRow['fields']> = { ...(next.fields ?? {}) }
      for (const field of fields) {
        const { path: fp, allowUpdate } = field
        const fr: Record<string, boolean> = { ...(f[fp] ?? {}) }
        for (const op of opsForField(fp)) {
          fr[op] =
            on &&
            can(op as TOp) &&
            next[op as keyof ModelRow] === true &&
            !(op === 'update' && allowUpdate === false)
        }
        f[fp] = fr
      }
      next.fields = f
    }
    writeRow(next)
  }

  const parentFieldOpOn = (fp: string, op: FieldOp): boolean => {
    const parent = parentFieldPath(fp)
    if (!parent) return true
    return row.fields?.[parent]?.[op] === true && parentFieldOpOn(parent, op)
  }

  const clearDescendantFieldOp = (
    f: NonNullable<ModelRow['fields']>,
    ancestor: string,
    op: FieldOp
  ) => {
    for (const key of Object.keys(f)) {
      if (!isDescendantFieldPath(key, ancestor)) continue
      f[key] = { ...(f[key] ?? {}), [op]: false }
    }
  }

  const setField = (fp: string, op: FieldOp, on: boolean) => {
    if (!opsForField(fp).includes(op)) return
    if (on && row[op as keyof ModelRow] !== true) return
    if (on && !can(op as TOp)) return
    if (on && !parentFieldOpOn(fp, op)) return
    const fieldMeta = fields.find((f) => f.path === fp)
    if (on && op === 'update' && fieldMeta?.allowUpdate === false) return
    const next: ModelRow = { ...(row ?? {}) }
    const f = { ...(next.fields ?? {}) }
    f[fp] = { ...(f[fp] ?? {}), [op]: on }
    if (!on) clearDescendantFieldOp(f, fp, op)
    next.fields = f
    writeRow(next)
  }

  const setFieldAll = (fp: string, on: boolean) => {
    const fieldMeta = fields.find((f) => f.path === fp)
    const next: ModelRow = { ...(row ?? {}) }
    const f = { ...(next.fields ?? {}) }
    const fr: Record<string, boolean> = { ...(f[fp] ?? {}) }
    for (const op of opsForField(fp)) {
      if (op === 'update' && fieldMeta?.allowUpdate === false) {
        fr[op] = false
        continue
      }
      fr[op] = Boolean(
        on && row[op as keyof ModelRow] === true && can(op as TOp) && parentFieldOpOn(fp, op)
      )
    }
    f[fp] = fr
    if (!on) {
      for (const key of Object.keys(f)) {
        if (isDescendantFieldPath(key, fp)) delete f[key]
      }
    }
    next.fields = f
    writeRow(next)
  }

  return { setOp, setAll, setField, setFieldAll }
}
