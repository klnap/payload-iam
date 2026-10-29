import {
  MATRIX_INCLUDE_HIDDEN_FIELD_NAMES,
  MATRIX_SKIP_FIELD_NAMES,
} from '#iam/core/permissions/matrix-constants'

export type FieldOp = 'create' | 'read' | 'update'
export type CollectionOp = 'create' | 'read' | 'update' | 'delete' | 'publish'
export type GlobalOp = 'read' | 'update' | 'publish'

export type FieldPerms = Partial<Record<FieldOp, boolean>>
export type CollectionPerms = Partial<Record<CollectionOp, boolean>> & {
  fields?: Record<string, FieldPerms>
}
export type GlobalPerms = Partial<Record<GlobalOp, boolean>> & {
  fields?: Record<string, FieldPerms>
}

export type PermissionsValue = {
  collections?: Record<string, CollectionPerms>
  globals?: Record<string, GlobalPerms>
  /** Registered admin routes — key = stable id from `IamOptions.register`. */
  register?: Record<string, RegisterPerms>
}

/** Default gate for custom admin models — more ops allowed via `permissions.register[id]`. */
export type RegisterOp = 'read'
export type RegisterPerms = Partial<Record<string, boolean>> & {
  fields?: Record<string, FieldPerms>
}

export type FieldPathEntry = {
  /** Dotted path — permissions JSON key. */
  path: string
  /** Human label, nested as `SEO > Title`. */
  label: string
  /** False when field is admin.readOnly — update checkbox stays off. */
  allowUpdate?: boolean
  /** Matrix columns for this row; default model `fieldOps`. */
  ops?: FieldOp[]
}

/** Payload field config shape accepted by `walkFieldPaths` / `collectionMatrixModel`. */
export type PayloadMatrixField = {
  name?: string
  type?: string
  label?: string | Record<string, string>
  virtual?: boolean
  access?: {
    create?: unknown
    read?: unknown
    update?: unknown
  }
  admin?: {
    hidden?: boolean
    readOnly?: boolean
    disabled?: boolean
    disable?: boolean
  }
  fields?: PayloadMatrixField[]
  tabs?: Array<{
    fields?: PayloadMatrixField[]
    name?: string
    label?: string | Record<string, string>
  }>
  blocks?: Array<{ slug?: string; fields?: PayloadMatrixField[] }>
}

function accessDenied(v: unknown): boolean {
  return v === false
}

function shouldSkipMatrixField(f: PayloadMatrixField): boolean {
  if (f.type === 'ui') return true
  if (f.name && MATRIX_SKIP_FIELD_NAMES.has(f.name)) return true
  if (f.admin?.hidden === true) {
    if (f.name && MATRIX_INCLUDE_HIDDEN_FIELD_NAMES.has(f.name)) return false
    return true
  }
  if (f.admin?.disable === true) return true
  if (accessDenied(f.access?.read)) return true
  return false
}

function fieldAllowUpdate(f: PayloadMatrixField): boolean {
  if (f.virtual) return false
  if (f.admin?.readOnly === true) return false
  if (f.admin?.disabled === true) return false
  if (accessDenied(f.access?.update)) return false
  return true
}

/** Matrix columns for a Payload field row (omit row when empty). */
export function matrixFieldOpsForPayload(f: PayloadMatrixField): FieldOp[] {
  if (shouldSkipMatrixField(f)) return []
  const allowUpdate = fieldAllowUpdate(f)
  if (!allowUpdate) return ['read']
  const ops: FieldOp[] = ['read']
  if (!accessDenied(f.access?.create)) ops.unshift('create')
  if (!accessDenied(f.access?.update)) ops.push('update')
  return ops
}

function matrixFieldEntry(
  path: string,
  label: string,
  f: PayloadMatrixField
): FieldPathEntry | null {
  const ops = matrixFieldOpsForPayload(f)
  if (ops.length === 0) return null
  const allowUpdate = fieldAllowUpdate(f)
  return { path, label: formatMatrixFieldLabel(label), allowUpdate, ops }
}

function pickLabel(v: string | Record<string, string> | undefined, fallback: string): string {
  if (typeof v === 'string' && v.trim()) return v
  if (v && typeof v === 'object') {
    const first = Object.values(v).find((x) => typeof x === 'string' && x.trim())
    if (typeof first === 'string') return first
  }
  return fallback
}

function humanizeName(name: string): string {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
  if (!spaced) return name
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase())
}

function joinLabel(prefix: string, part: string): string {
  return prefix ? `${prefix} > ${part}` : part
}

/** Strip host/CMS noise from admin labels — matrix shows field name only. */
export function formatMatrixFieldLabel(label: string): string {
  return label
    .replace(/\s*\(per locale\)\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Matrix UI — single-line field title (no `Group > Field` breadcrumbs). */
export function matrixLeafFieldLabel(label: string): string {
  const cleaned = formatMatrixFieldLabel(label)
  const segments = cleaned
    .split(' > ')
    .map((s) => s.trim())
    .filter(Boolean)
  return segments.length > 0 ? segments[segments.length - 1]! : cleaned
}

/** Flatten Payload field tree → path + label for matrix rows. */
export function walkFieldPaths(
  fields: PayloadMatrixField[] | undefined,
  pathPrefix = '',
  labelPrefix = ''
): FieldPathEntry[] {
  if (!fields?.length) return []
  const out: FieldPathEntry[] = []
  for (const f of fields) {
    if (!f || typeof f !== 'object') continue
    if (shouldSkipMatrixField(f)) {
      // Still walk into named groups that were skipped only by name? No — skip whole branch for ui/hidden.
      // Row/group chrome without a name still needs children walked.
      if (
        (f.type === 'row' || f.type === 'collapsible' || f.type === 'group') &&
        !f.name &&
        Array.isArray(f.fields)
      ) {
        out.push(...walkFieldPaths(f.fields, pathPrefix, labelPrefix))
      }
      continue
    }
    if (f.type === 'tabs' && Array.isArray(f.tabs)) {
      for (const tab of f.tabs) {
        const tabPath =
          tab.name && pathPrefix ? `${pathPrefix}.${tab.name}` : tab.name || pathPrefix
        const tabLabel = tab.name
          ? joinLabel(labelPrefix, pickLabel(tab.label, humanizeName(tab.name)))
          : labelPrefix
        out.push(...walkFieldPaths(tab.fields, tabPath, tabLabel))
      }
      continue
    }
    if (f.type === 'row' || f.type === 'collapsible' || f.type === 'group') {
      const nextPath =
        f.name && pathPrefix ? `${pathPrefix}.${f.name}` : f.name ? f.name : pathPrefix
      const nextLabel = f.name
        ? joinLabel(labelPrefix, pickLabel(f.label, humanizeName(f.name)))
        : labelPrefix
      if (f.name && f.type === 'group') {
        const groupEntry = matrixFieldEntry(nextPath, nextLabel, f)
        if (groupEntry) out.push(groupEntry)
      }
      out.push(...walkFieldPaths(f.fields, nextPath || pathPrefix, nextLabel))
      continue
    }
    if (f.type === 'array' && f.name) {
      const path = pathPrefix ? `${pathPrefix}.${f.name}` : f.name
      const label = joinLabel(labelPrefix, pickLabel(f.label, humanizeName(f.name)))
      const arrayEntry = matrixFieldEntry(path, label, f)
      if (arrayEntry) out.push(arrayEntry)
      out.push(...walkFieldPaths(f.fields, path, label))
      continue
    }
    if (f.type === 'blocks' && f.name) {
      const path = pathPrefix ? `${pathPrefix}.${f.name}` : f.name
      const label = joinLabel(labelPrefix, pickLabel(f.label, humanizeName(f.name)))
      const blocksEntry = matrixFieldEntry(path, label, f)
      if (blocksEntry) out.push(blocksEntry)
      continue
    }
    if (!f.name) continue
    const path = pathPrefix ? `${pathPrefix}.${f.name}` : f.name
    const label = joinLabel(labelPrefix, pickLabel(f.label, humanizeName(f.name)))
    const leafEntry = matrixFieldEntry(path, label, f)
    if (leafEntry) out.push(leafEntry)
  }
  // Dedupe by path, keep first label
  const seen = new Set<string>()
  return out.filter((e) => {
    if (seen.has(e.path)) return false
    seen.add(e.path)
    return true
  })
}

export function emptyPermissions(): PermissionsValue {
  return { collections: {}, globals: {}, register: {} }
}
