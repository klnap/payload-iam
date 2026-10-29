import type { CollectionOp, FieldOp, PayloadMatrixField } from '#iam/core/permissions/shape'
import { walkFieldPaths } from '#iam/core/permissions/shape'
import { type DraftsConfigSource, hasDraftsEnabled } from '#iam/core/rbac/drafts-enabled'
import { defineRbacModel, type RbacPermissionModel } from './register-model'

/**
 * Full entity columns (draft-enabled collections).
 * - `update` — edit content / save draft / field parent
 * - `publish` — publish to live (save + publish); without it publish is denied
 */
export const COLLECTION_MATRIX_OPS: readonly CollectionOp[] = [
  'create',
  'read',
  'update',
  'delete',
  'publish',
]

const COLLECTION_BASE_OPS: readonly CollectionOp[] = ['create', 'read', 'update', 'delete']

/** Same field columns as the Roles → Collections matrix. */
export const COLLECTION_MATRIX_FIELD_OPS: readonly FieldOp[] = ['create', 'read', 'update']

export type CollectionMatrixConfigSource = DraftsConfigSource

/** Entity columns for one collection — `publish` only when drafts are enabled. */
export function collectionEntityMatrixOps(
  collection: CollectionMatrixConfigSource
): CollectionOp[] {
  const ops: CollectionOp[] = [...COLLECTION_BASE_OPS]
  if (hasDraftsEnabled(collection)) ops.push('publish')
  return ops
}

export function collectionMatrixFrameOps(
  collections: CollectionMatrixConfigSource[]
): CollectionOp[] {
  const set = new Set<CollectionOp>()
  for (const c of collections) {
    for (const op of collectionEntityMatrixOps(c)) set.add(op)
  }
  const ordered: CollectionOp[] = ['create', 'read', 'update', 'delete', 'publish']
  return ordered.filter((op) => set.has(op))
}

export type CollectionMatrixModelInput = {
  id: string
  label: string
  path?: string
  tab?: string
  /**
   * Payload `collection.fields` (or compatible tree) — rows match `walkFieldPaths` in Collections matrix.
   */
  fields: PayloadMatrixField[] | undefined
  ops?: readonly string[]
  fieldOps?: readonly FieldOp[]
}

/**
 * Build a register model with the same ops + field tree as a collection permissions matrix.
 * Use when a custom admin view mirrors a collection-shaped surface.
 */
export function collectionMatrixModel(input: CollectionMatrixModelInput): RbacPermissionModel {
  const ops = input.ops ?? COLLECTION_MATRIX_OPS
  const fieldOps = input.fieldOps ?? COLLECTION_MATRIX_FIELD_OPS
  const walked = walkFieldPaths(input.fields)
  return defineRbacModel({
    id: input.id,
    label: input.label,
    path: input.path,
    tab: input.tab,
    ops,
    fieldOps,
    fields: walked.map((f) => ({
      path: f.path,
      label: f.label,
      allowUpdate: f.allowUpdate,
      ops: f.ops,
    })),
  })
}
