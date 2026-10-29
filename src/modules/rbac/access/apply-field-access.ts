import type { Field, FieldAccess } from 'payload'
import { hasBaAdminSession } from '#iam/core/auth/ba-admin-session'
import {
  effectiveIsRoot,
  effectivePermissions,
  pluginCollectionPermission,
  pluginGlobalPermission,
  type RolePermissions,
} from './can'

type UserLike = {
  id?: string | number
  type?: string
  roles?: Array<{ name?: string; permissions?: RolePermissions } | string>
  isActive?: boolean
  provisioningStatus?: string
}

type FieldOp = 'create' | 'read' | 'update'

/**
 * Fields a user may read on their own `users` doc without `users.read`.
 * Needed for `/me` + account UI; everything else falls through to matrix RBAC
 * (avoids leaking provisioning hashes, internal ids, etc. via blanket self-read).
 */
const USERS_SELF_READ_FIELDS = new Set([
  'email',
  'fullName',
  'roles',
  'roleLabels',
  'iamIsRoot',
  'isActive',
  'provisioningStatus',
  'avatar',
  'identity',
  'authAccountInsights',
  'adminUserSessions',
  'createdAt',
  'updatedAt',
  'collection',
])

function isUsersSelfReadField(fieldPath: string): boolean {
  if (USERS_SELF_READ_FIELDS.has(fieldPath)) return true
  if (fieldPath.startsWith('identity.')) return true
  const leaf = fieldPath.includes('.') ? fieldPath.slice(fieldPath.lastIndexOf('.') + 1) : fieldPath
  return USERS_SELF_READ_FIELDS.has(leaf)
}

function collectionEntityOp(op: FieldOp): 'create' | 'read' | 'update' {
  return op
}

function fieldFlagAllowed(
  user: UserLike | null | undefined,
  kind: 'collections' | 'globals',
  slug: string,
  fieldPath: string,
  op: FieldOp
): boolean {
  if (!user || user.isActive === false) return false
  if (user.provisioningStatus && user.provisioningStatus !== 'none') {
    return false
  }
  if (user.type === 'service') return false
  if (effectiveIsRoot(user)) return true

  const entityOk =
    kind === 'collections'
      ? pluginCollectionPermission(user, slug, collectionEntityOp(op))
      : op === 'create'
        ? pluginGlobalPermission(user, slug, 'update')
        : pluginGlobalPermission(user, slug, op === 'read' ? 'read' : 'update')
  if (!entityOk) return false

  const perms = effectivePermissions(user)
  if (!perms) return false
  const row = kind === 'collections' ? perms.collections?.[slug] : perms.globals?.[slug]
  const fieldRow = row?.fields?.[fieldPath]
  if (!fieldRow || fieldRow[op] === undefined) {
    return entityOk
  }
  return fieldRow[op] === true
}

function wrapRbacFieldAccess(args: {
  kind: 'collections' | 'globals'
  slug: string
  fieldPath: string
  op: FieldOp
  packageOwned: boolean
  hostAccess?: FieldAccess
}): FieldAccess {
  return async (ctx) => {
    const user = ctx.req.user as UserLike | undefined
    if (args.packageOwned) {
      if (!user || user.type === 'service') return false
      if (!hasBaAdminSession(user)) return false
    } else if (!user) {
      // Fail-closed: anonymous without host field access cannot touch fields
      // (collection access is also fail-closed; this blocks mass-assign if host opens entity).
      if (!args.hostAccess) return false
      return Boolean(await args.hostAccess(ctx))
    } else if (user.type === 'service') {
      if (!args.hostAccess) return false
      return Boolean(await args.hostAccess(ctx))
    }

    // Self-read allowlist on `users` — identity for `/me` / account without `users.read`.
    // Do not blanket-allow every field (provisioning hashes, internal ops, …).
    const docId = ctx.id ?? (ctx.doc as { id?: unknown } | undefined)?.id
    if (
      args.op === 'read' &&
      args.packageOwned &&
      args.slug === 'users' &&
      user?.id != null &&
      docId != null &&
      String(user.id) === String(docId) &&
      isUsersSelfReadField(args.fieldPath)
    ) {
      if (!args.hostAccess) return true
      return Boolean(await args.hostAccess(ctx))
    }

    if (!fieldFlagAllowed(user, args.kind, args.slug, args.fieldPath, args.op)) {
      return false
    }
    if (!args.hostAccess) return true
    return Boolean(await args.hostAccess(ctx))
  }
}

function mergeFieldAccess(
  field: Field,
  args: {
    kind: 'collections' | 'globals'
    slug: string
    fieldPath: string
    packageOwned: boolean
  }
): Field {
  const host = 'access' in field ? field.access : undefined
  const wrap = (op: FieldOp) =>
    wrapRbacFieldAccess({
      ...args,
      op,
      hostAccess: host?.[op] as FieldAccess | undefined,
    })

  return {
    ...field,
    access: {
      ...host,
      create: wrap('create'),
      read: wrap('read'),
      update: wrap('update'),
    },
  } as Field
}

type FieldLike = Field & {
  fields?: FieldLike[]
  tabs?: Array<{ name?: string; fields?: FieldLike[] }>
  blocks?: Array<{ fields?: FieldLike[] }>
}

function applyToFields(
  fields: Field[] | undefined,
  ctx: {
    kind: 'collections' | 'globals'
    slug: string
    packageOwned: boolean
    pathPrefix: string
  }
): Field[] | undefined {
  if (!fields?.length) return fields
  return fields.map((raw) => {
    const f = raw as FieldLike
    if ('tabs' in f && Array.isArray(f.tabs)) {
      return {
        ...f,
        tabs: f.tabs.map((tab) => {
          const tabPath =
            tab.name && ctx.pathPrefix
              ? `${ctx.pathPrefix}.${tab.name}`
              : tab.name || ctx.pathPrefix
          return {
            ...tab,
            fields: applyToFields(tab.fields as Field[], {
              ...ctx,
              pathPrefix: tabPath,
            }),
          }
        }),
      } as Field
    }
    if (
      (f.type === 'row' || f.type === 'collapsible' || f.type === 'group') &&
      Array.isArray(f.fields)
    ) {
      const named = 'name' in f && typeof f.name === 'string' ? f.name : undefined
      const nextPath =
        named && ctx.pathPrefix ? `${ctx.pathPrefix}.${named}` : named ? named : ctx.pathPrefix
      let next = {
        ...f,
        fields: applyToFields(f.fields, { ...ctx, pathPrefix: nextPath }),
      } as FieldLike
      if (named && f.type === 'group') {
        next = mergeFieldAccess(next as Field, {
          ...ctx,
          fieldPath: nextPath,
        }) as FieldLike
      }
      return next as Field
    }
    if (f.type === 'array' && f.name && Array.isArray(f.fields)) {
      const path = ctx.pathPrefix ? `${ctx.pathPrefix}.${f.name}` : f.name
      const withChildren = {
        ...mergeFieldAccess(f as Field, { ...ctx, fieldPath: path }),
        fields: applyToFields(f.fields, { ...ctx, pathPrefix: path }),
      }
      return withChildren as Field
    }
    if (f.type === 'blocks' && f.name) {
      const path = ctx.pathPrefix ? `${ctx.pathPrefix}.${f.name}` : f.name
      return mergeFieldAccess(f as Field, { ...ctx, fieldPath: path })
    }
    if (!('name' in f) || typeof f.name !== 'string') return f
    const path = ctx.pathPrefix ? `${ctx.pathPrefix}.${f.name}` : f.name
    return mergeFieldAccess(f as Field, { ...ctx, fieldPath: path })
  })
}

/** Attach RBAC field access from role permissions JSON (paths match permissions matrix). */
export function applyRbacFieldAccess(args: {
  fields: Field[] | undefined
  kind: 'collections' | 'globals'
  slug: string
  packageOwned: boolean
}): Field[] | undefined {
  return applyToFields(args.fields, {
    kind: args.kind,
    slug: args.slug,
    packageOwned: args.packageOwned,
    pathPrefix: '',
  })
}
