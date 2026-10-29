import type { Access, FieldAccess, Where } from 'payload'
import { hasBaAdminSession } from '#iam/core/auth/ba-admin-session'
import type { RolePermissions } from '#iam/core/permissions/role-permissions'
import { emptyPermissions } from '#iam/core/permissions/shape'
import { unionRolePermissions } from '#iam/core/permissions/union-role-permissions'
import { isRootRole } from '#iam/core/rbac/is-root-role'

export type { RolePermissions } from '#iam/core/permissions/role-permissions'

type RoleDoc = {
  id?: string
  name?: string
  permissions?: RolePermissions
}

/** Payload `req.user` and RBAC user docs — index signature keeps assignability from generated Payload types. */
export type RbacAccessUser = {
  type?: string
  authChannel?: string
  roles?: Array<RoleDoc | string>
  isActive?: boolean
  provisioningStatus?: string
} & Record<string, unknown>

type UserLike = RbacAccessUser

function roleDocs(user: UserLike | null | undefined): RoleDoc[] {
  if (!user) return []
  if (!Array.isArray(user.roles) || user.roles.length === 0) return []
  return user.roles.filter((r): r is RoleDoc => typeof r === 'object' && r != null)
}

export function effectiveIsRoot(user: RbacAccessUser | null | undefined): boolean {
  if (user?.iamIsRoot === true) return true
  return roleDocs(user).some((r) => isRootRole(r))
}

/**
 * Resolves Payload-side RBAC from `req.user` roles (not client input).
 * Trust: authenticated identity → role docs → union grants → Payload access checks.
 */
export function effectivePermissions(
  user: RbacAccessUser | null | undefined
): RolePermissions | null {
  const roles = roleDocs(user).filter((r) => !isRootRole(r))
  if (roles.length === 0) {
    return effectiveIsRoot(user) ? emptyPermissions() : null
  }
  let out: RolePermissions = {}
  for (const r of roles) {
    const p = r.permissions
    if (!p) continue
    const slice: RolePermissions = {
      collections: p.collections,
      globals: p.globals,
      register: p.register,
    }
    out = unionRolePermissions(out, slice)
  }
  if (!out.collections && !out.globals && !out.register) {
    return emptyPermissions()
  }
  return out
}

/** pluginBoolean ∩ hostAccess — false ∩ anything = false; true ∩ Where = Where */
export function intersectAccess(
  plugin: boolean | Where,
  host: boolean | Where | undefined
): boolean | Where {
  if (plugin === false || host === false) return false
  if (plugin === true && (host === true || host === undefined)) return true
  if (plugin === true && typeof host === 'object') return host
  if (typeof plugin === 'object' && (host === true || host === undefined)) return plugin
  if (typeof plugin === 'object' && typeof host === 'object') {
    return { and: [plugin, host] }
  }
  return false
}

export function pluginCollectionPermission(
  user: RbacAccessUser | null | undefined,
  collection: string,
  op: 'create' | 'read' | 'update' | 'delete' | 'publish' | 'unlock' | 'readVersions'
): boolean {
  if (!user || user.isActive === false) return false
  if (user.provisioningStatus && user.provisioningStatus !== 'none') return false
  if (user.type === 'service') return false
  if (effectiveIsRoot(user)) return true
  const perms = effectivePermissions(user)
  if (!perms) return false
  if (op === 'readVersions') {
    return Boolean(perms.collections?.[collection]?.read)
  }
  if (op === 'unlock') {
    return Boolean(perms.collections?.[collection]?.update)
  }
  return Boolean(perms.collections?.[collection]?.[op])
}

export function pluginGlobalPermission(
  user: RbacAccessUser | null | undefined,
  globalSlug: string,
  op: 'read' | 'update' | 'publish' | 'readVersions'
): boolean {
  if (!user || user.isActive === false) return false
  if (user.provisioningStatus && user.provisioningStatus !== 'none') return false
  if (user.type === 'service') return false
  if (effectiveIsRoot(user)) return true
  const perms = effectivePermissions(user)
  if (!perms) return false
  if (op === 'readVersions') {
    return Boolean(perms.globals?.[globalSlug]?.read)
  }
  return Boolean(perms.globals?.[globalSlug]?.[op])
}

/** Payload publishes via update + query flags — not a separate Access key. */
export function isPayloadPublishRequest(req: {
  query?: Record<string, unknown> | undefined
}): boolean {
  const q = req.query
  if (!q || typeof q !== 'object') return false
  if (q.publishSpecificLocale != null && q.publishSpecificLocale !== '') return true
  if (q.publishAllLocales === true || q.publishAllLocales === 'true') return true
  if (q.unpublishAllLocales === true || q.unpublishAllLocales === 'true') return true
  return false
}

/**
 * Detect publish (vs draft save). Requires entity `publish` grant — `update` alone is not enough.
 * - REST: `publishSpecificLocale` / `publishAllLocales` / unpublish flags
 * - Admin: `hasPublishPermission` probes `update` with `data._status === 'published'`
 */
export function isPayloadPublishMutation(args: {
  req: { query?: Record<string, unknown> | undefined }
  data?: { _status?: unknown } | null
}): boolean {
  if (isPayloadPublishRequest(args.req)) return true
  if (args.data?._status !== 'published') return false
  const draft = args.req.query?.draft
  if (draft === true || draft === 'true') return false
  return true
}

export function canAccessAdmin(user: RbacAccessUser | null | undefined): boolean {
  if (!user || user.isActive === false) return false
  if (user.provisioningStatus && user.provisioningStatus !== 'none') return false
  if (user.type === 'service') return false
  if (!hasBaAdminSession(user)) return false
  if (effectiveIsRoot(user)) return true
  // any assigned role ⇒ panel entry (content still gated by wrapModelAccess)
  return roleDocs(user).length > 0
}

/** Field row on a register model — parent entity op + `permissions.register[id].fields[path][op]`. */
export function canAccessRegisterField(
  user: RbacAccessUser | null | undefined,
  registerId: string,
  fieldPath: string,
  op: 'create' | 'read' | 'update'
): boolean {
  if (!user || user.isActive === false) return false
  if (user.provisioningStatus && user.provisioningStatus !== 'none') return false
  if (user.type === 'service') return false
  if (effectiveIsRoot(user)) return true
  const perms = effectivePermissions(user)
  if (!perms) return false
  const row = perms.register?.[registerId]
  if (row?.[op] !== true) return false
  return row.fields?.[fieldPath]?.[op] === true
}

/** Registered admin model from `IamOptions.register` / `models` — `permissions.register[id][op]`. */
export function canAccessRegister(
  user: RbacAccessUser | null | undefined,
  registerId: string,
  op: string = 'read'
): boolean {
  if (!user || user.isActive === false) return false
  if (user.provisioningStatus && user.provisioningStatus !== 'none') return false
  if (user.type === 'service') return false
  if (effectiveIsRoot(user)) return true
  const perms = effectivePermissions(user)
  if (!perms) return false
  const row = perms.register?.[registerId] as Record<string, boolean | undefined> | undefined
  return row?.[op] === true
}

/**
 * Package Access wrapper — package-owned: anonymous + service DENY;
 * requires ba-admin-session for human RBAC path.
 * Host content: anonymous/service → hostOnly; human → plugin ∩ host.
 */
export function wrapModelAccess(args: {
  collection: string
  op: 'create' | 'read' | 'update' | 'delete' | 'unlock' | 'readVersions'
  packageOwned?: boolean
  hostAccess?: Access
}): Access {
  return async (ctx) => {
    const user = ctx.req.user as UserLike | undefined
    if (args.packageOwned) {
      if (!user) return false
      if (user.type === 'service') return false
      if (!hasBaAdminSession(user)) return false
    } else if (!user) {
      // content anonymous = hostOnly
      if (!args.hostAccess) return false
      return args.hostAccess(ctx)
    } else if (user.type === 'service') {
      if (!args.hostAccess) return false
      return args.hostAccess(ctx)
    }

    let plugin = pluginCollectionPermission(user, args.collection, args.op)
    if (
      plugin &&
      args.op === 'update' &&
      isPayloadPublishMutation({
        req: ctx.req,
        data: (ctx as { data?: { _status?: unknown } }).data,
      })
    ) {
      plugin = pluginCollectionPermission(user, args.collection, 'publish')
    }
    const hostResult = args.hostAccess ? await args.hostAccess(ctx) : true
    return intersectAccess(plugin, hostResult as boolean | Where)
  }
}

/** Globals: anonymous/service → hostOnly; human → plugin ∩ host. */
export function wrapGlobalAccess(args: {
  global: string
  op: 'read' | 'update' | 'readVersions'
  hostAccess?: Access
}): Access {
  return async (ctx) => {
    const user = ctx.req.user as UserLike | undefined
    if (!user) {
      if (!args.hostAccess) return false
      return args.hostAccess(ctx)
    }
    if (user.type === 'service') {
      if (!args.hostAccess) return false
      return args.hostAccess(ctx)
    }

    let plugin = pluginGlobalPermission(user, args.global, args.op)
    if (
      plugin &&
      args.op === 'update' &&
      isPayloadPublishMutation({
        req: ctx.req,
        data: (ctx as { data?: { _status?: unknown } }).data,
      })
    ) {
      plugin = pluginGlobalPermission(user, args.global, 'publish')
    }
    const hostResult = args.hostAccess ? await args.hostAccess(ctx) : true
    return intersectAccess(plugin, hostResult as boolean | Where)
  }
}

/** Field access: boolean AND boolean only — never Where */
export function wrapFieldAccess(args: {
  pluginAllow: (user: RbacAccessUser | null | undefined) => boolean
  hostAccess?: FieldAccess
}): FieldAccess {
  return async (ctx) => {
    const user = ctx.req.user as UserLike | undefined
    if (user?.type === 'service') return false
    if (user && !hasBaAdminSession(user)) return false
    const pluginOk = args.pluginAllow(user)
    if (!pluginOk) return false
    if (!args.hostAccess) return true
    const hostOk = await args.hostAccess(ctx)
    return Boolean(hostOk)
  }
}
