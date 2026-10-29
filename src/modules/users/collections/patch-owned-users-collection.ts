import type { CollectionConfig, Field, FieldHook } from 'payload'
import { APIError } from 'payload'
import { createBetterAuthStrategy } from '#iam/adapters/better-auth/strategy'
import {
  getInternalOperation,
  resolveInternalOperationKind,
  runWithInternalOperation,
} from '#iam/adapters/payload/operation-als'
import type { ServicePrincipal } from '#iam/modules/auth/services/pre-payload-service-auth'
import { isRootRole, ROOT_ROLE_NAME } from '#iam/modules/bootstrap/index'
import {
  applyRbacFieldAccess,
  assertRolesAssignable,
  canAccessAdmin,
  canCallerAccessTargetUser,
  loadUserForAccessCheck,
  resolveCallerCeiling,
  roleIdsOutsideCallerCeiling,
  roleLabelsAfterRead,
  wrapModelAccess,
} from '#iam/modules/rbac'
import { canListUserSessions } from '#iam/modules/sessions'
import { lockListColumns, withOwnedTimestamps } from '#iam/modules/users/config/list-columns'
import { applyUserAdminTabsLayout } from '#iam/modules/users/fields/user-admin-tabs'
import {
  loadAdminUserSessions,
  loadUserAuthAccountInsights,
  shouldEnrichUserAdminDocument,
} from '#iam/modules/users/services/user-document-enrichment'
import { mergeOwnedCollectionEditViews } from '#iam/plugin/owned-collection-edit-views'
import { readIamSurface } from '#iam/plugin/runtime/payload-iam-surface'
import { i18n } from '#iam/shared/i18n/i18n-label'
import type { LoginFlags } from '#iam/types/login-flags'

const PROVISIONING_HIDDEN = {
  readOnly: true,
  hidden: true,
  disableListColumn: true,
  disableListFilter: true,
} as const

const USERS_LIST_COLUMNS = new Set([
  'avatar',
  'email',
  'fullName',
  'isActive',
  'roleLabels',
  'updatedAt',
])

function hideProvisioningAdmin(field: Field): Field {
  if (!('name' in field)) return field
  if (
    field.name !== 'provisioningStatus' &&
    field.name !== 'provisioningOperationId' &&
    field.name !== 'provisioningRequestHash'
  ) {
    return field
  }
  return {
    ...field,
    admin: { ...(field.admin ?? {}), ...PROVISIONING_HIDDEN },
  } as Field
}

export type PatchOwnedUsersContext = {
  usersSlug: string
  loginFlags: LoginFlags
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAuth: () => any
  getServicePrincipalFromHeaders?: (
    headers: Headers
  ) => ServicePrincipal | null | Promise<ServicePrincipal | null>
}

export function patchOwnedUsersCollection(
  base: CollectionConfig,
  options: PatchOwnedUsersContext
): CollectionConfig {
  const usersSlug = options.usersSlug
  const users = { ...base }
  users.versions = false
  users.trash = false
  // Bulk DELETE /api/users would skip per-doc ceiling; Payload disables the API when set.
  // Do NOT return false from access.delete when id is missing — that hides Delete in admin UI
  // (getAccessResults probes without id).
  users.disableBulkDelete = true
  users.auth = {
    ...(typeof users.auth === 'object' ? users.auth : {}),
    disableLocalStrategy: true,
    useSessions: false,
    useAPIKey: false,
    verify: false,
    loginWithUsername: false,
    removeTokenFromResponses: true,
    strategies: [
      createBetterAuthStrategy({
        getAuth: options.getAuth,
        getServicePrincipal: options.getServicePrincipalFromHeaders,
      }),
    ],
  }
  let fields = [...(users.fields ?? [])]
    .filter((f) => {
      if (!('name' in f)) return true
      return f.name !== 'role'
    })
    .map(hideProvisioningAdmin)

  const hasRolesField = fields.some((f) => 'name' in f && f.name === 'roles')
  const hasActive = fields.some((f) => 'name' in f && f.name === 'isActive')
  const hasProv = fields.some((f) => 'name' in f && f.name === 'provisioningStatus')
  const hasOpId = fields.some((f) => 'name' in f && f.name === 'provisioningOperationId')
  const hasHash = fields.some((f) => 'name' in f && f.name === 'provisioningRequestHash')
  // Host `name` → `fullName` (Payload SoT). BA user.name still synced from fullName.
  fields = fields.map((f) =>
    'name' in f && f.name === 'name'
      ? ({
          ...f,
          name: 'fullName',
          label: (f as { label?: string }).label ?? i18n('iam:rbac:fieldFullName'),
        } as Field)
      : f
  )
  const hasFullName = fields.some((f) => 'name' in f && f.name === 'fullName')
  if (!hasFullName) {
    fields.unshift({
      name: 'fullName',
      type: 'text',
      required: true,
      label: i18n('iam:rbac:fieldFullName'),
    })
  }
  const configureActiveField = (f: (typeof fields)[number]) => {
    if (!('name' in f) || f.name !== 'isActive') return f
    const prevAdmin = 'admin' in f && f.admin && typeof f.admin === 'object' ? { ...f.admin } : {}
    return {
      ...f,
      type: 'checkbox' as const,
      label: 'label' in f && f.label != null ? f.label : i18n('iam:rbac:fieldActive'),
      admin: {
        ...prevAdmin,
        position: 'sidebar',
      },
    }
  }
  if (!hasActive) {
    fields.push(
      configureActiveField({
        name: 'isActive',
        type: 'checkbox',
        defaultValue: false,
        label: i18n('iam:rbac:fieldActive'),
      }) as Field
    )
  } else {
    fields = fields.map(configureActiveField) as Field[]
  }
  // Plugin-owned relationship — stock UI cannot assign Root role (beforeChange).
  // Roles set on create (never empty) so required stays true through provisioning.
  // No filterOptions: access-controlled find breaks anonymous bootstrap.
  const configureRolesField = (f: (typeof fields)[number]) => {
    if (!('name' in f) || f.name !== 'roles') return f
    const prevAdmin = 'admin' in f && f.admin && typeof f.admin === 'object' ? { ...f.admin } : {}
    delete (prevAdmin as { description?: unknown }).description
    const next = {
      ...f,
      label: i18n('iam:rbac:fieldRole'),
      type: 'relationship' as const,
      relationTo: 'roles' as never,
      hasMany: true,
      required: true,
      index: true,
      admin: {
        ...prevAdmin,
        position: 'sidebar',
        disableListColumn: true,
        components: {
          ...((prevAdmin as { components?: object }).components ?? {}),
          Cell: '@klnap/payload-iam/rsc#RolesListCell',
        },
      },
    }
    delete (next as { filterOptions?: unknown }).filterOptions
    return next
  }
  fields = fields.map(configureRolesField) as Field[]
  if (!hasRolesField) {
    fields.push(
      configureRolesField({
        name: 'roles',
        type: 'relationship',
        relationTo: 'roles' as never,
        hasMany: true,
        required: true,
        index: true,
      }) as Field
    )
  }
  const hasRoleLabels = fields.some((f) => 'name' in f && f.name === 'roleLabels')
  if (!hasRoleLabels) {
    fields.push({
      name: 'roleLabels',
      type: 'text',
      label: i18n('iam:rbac:fieldRole'),
      virtual: true,
      admin: {
        readOnly: true,
        hidden: true,
        disableListFilter: true,
      },
      hooks: {
        afterRead: [roleLabelsAfterRead],
      },
    })
  }
  const hasIamIsRoot = fields.some((f) => 'name' in f && f.name === 'iamIsRoot')
  if (!hasIamIsRoot) {
    const iamIsRootAfterRead: FieldHook = async ({ data, req }) => {
      const roles = data?.roles
      if (
        Array.isArray(roles) &&
        roles.some((r) => typeof r === 'object' && r != null && isRootRole(r as { name?: string }))
      ) {
        return true
      }
      const ids = Array.isArray(roles)
        ? roles.flatMap((v) => {
            if (v == null) return []
            if (typeof v === 'string' || typeof v === 'number') return [String(v)]
            if (typeof v === 'object' && 'id' in v && v.id != null) {
              return [String((v as { id: unknown }).id)]
            }
            return []
          })
        : []
      if (ids.length === 0) return false
      for (const id of ids) {
        const role = (await req.payload.findByID({
          collection: 'roles',
          id,
          depth: 0,
          overrideAccess: true,
        })) as { name?: string } | null
        if (isRootRole(role)) return true
      }
      return false
    }
    fields.push({
      name: 'iamIsRoot',
      type: 'checkbox',
      virtual: true,
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
      },
      hooks: {
        afterRead: [iamIsRootAfterRead],
      },
    })
  }
  const hasAvatar = fields.some((f) => 'name' in f && f.name === 'avatar')
  if (!hasAvatar) {
    fields.unshift({
      name: 'avatar',
      type: 'text',
      label: i18n('iam:rbac:fieldAvatar'),
      virtual: true,
      admin: {
        readOnly: true,
        hidden: true,
        disableListFilter: true,
        components: {
          Cell: '@klnap/payload-iam/rsc#UserAvatarCell',
        },
      },
      hooks: {
        afterRead: [
          ({ data }) => {
            const fullName = typeof data?.fullName === 'string' ? data.fullName : ''
            const email = typeof data?.email === 'string' ? data.email : ''
            return fullName.trim() || email.trim() || ''
          },
        ],
      },
    })
  }
  if (!hasProv) {
    fields.push({
      name: 'provisioningStatus',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: i18n('iam:rbac:provisioningStatusNone'), value: 'none' },
        { label: i18n('iam:rbac:provisioningStatusProvisioning'), value: 'provisioning' },
        { label: i18n('iam:rbac:provisioningStatusDeleting'), value: 'deleting' },
      ],
      admin: { ...PROVISIONING_HIDDEN },
      access: {
        create: () => false,
        update: () => false,
      },
    })
  }
  if (!hasOpId) {
    fields.push({
      name: 'provisioningOperationId',
      type: 'text',
      unique: true,
      index: true,
      admin: { ...PROVISIONING_HIDDEN },
      access: {
        create: () => false,
        update: () => false,
      },
    })
  }
  if (!hasHash) {
    fields.push({
      name: 'provisioningRequestHash',
      type: 'text',
      admin: { ...PROVISIONING_HIDDEN },
      access: {
        create: () => false,
        update: () => false,
      },
    })
  }
  // Email = login identity (shared with BA). Never stock-editable after create.
  // Document UI: identity inside Account tab (UserIdentityField). List keeps columns.
  const lockEmailField = (f: (typeof fields)[number]) => {
    if (!('name' in f) || f.name !== 'email') return f
    return {
      ...f,
      admin: {
        ...('admin' in f && f.admin && typeof f.admin === 'object' ? f.admin : {}),
        readOnly: true,
        hidden: true,
      },
      access: {
        ...('access' in f && f.access && typeof f.access === 'object' ? f.access : {}),
        update: () => false,
      },
    }
  }
  fields = fields.map(lockEmailField) as Field[]
  const hasEmail = fields.some((f) => 'name' in f && f.name === 'email')
  if (!hasEmail) {
    fields.unshift(
      lockEmailField({
        name: 'email',
        type: 'email',
        required: true,
        unique: true,
      }) as Field
    )
  }
  fields = fields.map((f) => {
    if (!('name' in f) || f.name !== 'fullName') return f
    return {
      ...f,
      admin: {
        ...('admin' in f && f.admin && typeof f.admin === 'object' ? f.admin : {}),
        hidden: true,
      },
    }
  }) as Field[]

  const copyRequestHeaders = (req: { headers?: HeadersInit }): Headers => {
    const out = new Headers()
    if (!req.headers) return out
    const source = req.headers instanceof Headers ? req.headers : new Headers(req.headers)
    source.forEach((value, key) => {
      out.set(key, value)
    })
    return out
  }

  const authInsightsAfterRead: FieldHook = async ({ req, siblingData }) => {
    if (siblingData?.id == null) return null
    if (!shouldEnrichUserAdminDocument(req, usersSlug)) return null
    try {
      return await loadUserAuthAccountInsights({
        payload: req.payload,
        userId: String(siblingData.id),
        googleLoginEnabled: options.loginFlags.google,
        getAuth: options.getAuth,
      })
    } catch {
      return null
    }
  }

  const adminSessionsAfterRead: FieldHook = async ({ req, siblingData }) => {
    if (siblingData?.id == null) return []
    if (!shouldEnrichUserAdminDocument(req, usersSlug)) return []
    const actor = req.user
    const targetUserId = String(siblingData.id)
    const actorId = String((actor as { id?: string | number } | null | undefined)?.id ?? '')
    if (
      !actor ||
      !canListUserSessions({
        actor: actor as never,
        targetUserId,
        usersCollectionSlug: usersSlug,
        ...(actorId === targetUserId
          ? {}
          : {
              target: siblingData as {
                id?: string | number
                roles?: unknown
                isActive?: boolean
                type?: string
              },
            }),
      })
    ) {
      return []
    }
    try {
      return await loadAdminUserSessions({
        payload: req.payload,
        userId: String(siblingData.id),
        headers: copyRequestHeaders(req),
      })
    } catch {
      return []
    }
  }

  if (!fields.some((f) => 'name' in f && f.name === 'authAccountInsights')) {
    fields.push({
      name: 'authAccountInsights',
      type: 'json',
      virtual: true,
      admin: {
        hidden: true,
        readOnly: true,
        disableListColumn: true,
        disableListFilter: true,
      },
      hooks: {
        afterRead: [authInsightsAfterRead],
      },
    } as Field)
  }
  if (!fields.some((f) => 'name' in f && f.name === 'adminUserSessions')) {
    fields.push({
      name: 'adminUserSessions',
      type: 'json',
      virtual: true,
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
      },
      hooks: {
        afterRead: [adminSessionsAfterRead],
      },
    } as Field)
  }

  // Own timestamps + lock Columns picker (no provisioning / identity / …).
  fields = lockListColumns(
    withOwnedTimestamps(fields, { trash: Boolean(users.trash) }),
    USERS_LIST_COLUMNS
  )
  fields = applyUserAdminTabsLayout(fields, options.loginFlags.forgotPassword)
  users.fields =
    applyRbacFieldAccess({
      fields,
      kind: 'collections',
      slug: usersSlug,
      packageOwned: true,
    }) ?? fields

  users.labels = {
    singular: i18n('iam:rbac:collectionUserSingular'),
    plural: i18n('iam:rbac:collectionUserPlural'),
  }
  users.admin = mergeOwnedCollectionEditViews({
    ...(users.admin ?? {}),
    useAsTitle: 'email',
    group: false,
    defaultColumns: ['email', 'fullName', 'avatar', 'isActive', 'roleLabels', 'updatedAt'],
    components: {
      ...(users.admin?.components ?? {}),
      Description: '@klnap/payload-iam/rsc#AccessListTabs',
    },
  })

  const prevHooks = users.hooks?.beforeChange
  const prevList = Array.isArray(prevHooks) ? prevHooks : prevHooks ? [prevHooks] : []
  const prevAfterChange = users.hooks?.afterChange
  const prevAfterList = Array.isArray(prevAfterChange)
    ? prevAfterChange
    : prevAfterChange
      ? [prevAfterChange]
      : []
  const prevBeforeDelete = users.hooks?.beforeDelete
  const prevDeleteList = Array.isArray(prevBeforeDelete)
    ? prevBeforeDelete
    : prevBeforeDelete
      ? [prevBeforeDelete]
      : []
  const prevAfterMe = users.hooks?.afterMe
  const prevAfterMeList = Array.isArray(prevAfterMe)
    ? prevAfterMe
    : prevAfterMe
      ? [prevAfterMe]
      : []

  const mergeMeRolesFromStrategy = (
    responseUser: Record<string, unknown> | null | undefined,
    reqUser: unknown
  ): Record<string, unknown> | undefined => {
    if (!reqUser || typeof reqUser !== 'object') return responseUser ?? undefined
    const strategy = reqUser as Record<string, unknown>
    const strategyRoles = strategy.roles
    if (!Array.isArray(strategyRoles) || strategyRoles.length === 0) {
      return responseUser ?? undefined
    }
    const base =
      responseUser ??
      ({
        id: strategy.id,
        email: strategy.email,
        collection: strategy.collection,
      } as Record<string, unknown>)
    // Field RBAC can strip identity from the DB-shaped `/me` doc when the user
    // lacks `users.read` — restore from the authenticated strategy user.
    return {
      ...base,
      roles: strategyRoles,
      ...(strategy.iamIsRoot === true ? { iamIsRoot: true } : {}),
      ...(base.email == null && strategy.email != null ? { email: strategy.email } : {}),
      ...(base.fullName == null && strategy.fullName != null
        ? { fullName: strategy.fullName }
        : {}),
      ...(base.isActive == null && strategy.isActive != null
        ? { isActive: strategy.isActive }
        : {}),
    }
  }

  const roleIdsOf = (raw: unknown): string[] => {
    if (!Array.isArray(raw)) return []
    return raw.flatMap((v) => {
      if (v == null) return []
      if (typeof v === 'string' || typeof v === 'number') {
        return [String(v)]
      }
      if (typeof v === 'object' && 'id' in v && v.id != null) {
        return [String((v as { id: unknown }).id)]
      }
      return []
    })
  }

  async function resolveUserIsRoot(
    payload: {
      findByID: (args: {
        collection: string
        id: string
        depth: number
        overrideAccess: boolean
      }) => Promise<unknown>
    },
    doc: { roles?: unknown } | null | undefined
  ): Promise<boolean> {
    if (!doc) return false
    const roles = Array.isArray(doc.roles) ? doc.roles : []
    if (
      roles.some((r) => typeof r === 'object' && r != null && isRootRole(r as { name?: string }))
    ) {
      return true
    }
    for (const id of roleIdsOf(doc.roles)) {
      const role = (await payload.findByID({
        collection: 'roles',
        id,
        depth: 0,
        overrideAccess: true,
      })) as { name?: string } | null
      if (isRootRole(role)) return true
    }
    return false
  }

  users.hooks = {
    ...(users.hooks ?? {}),
    me: [
      ...(Array.isArray(users.hooks?.me)
        ? users.hooks.me
        : users.hooks?.me
          ? [users.hooks.me]
          : []),
      async ({ user, args }: { user: unknown; args: { req: { user?: unknown } } }) => {
        const merged = mergeMeRolesFromStrategy(
          user as Record<string, unknown> | null | undefined,
          args.req.user
        )
        if (!merged) return
        return { user: merged }
      },
    ] as unknown as NonNullable<NonNullable<CollectionConfig['hooks']>['me']>,
    afterMe: [
      ...prevAfterMeList,
      async (hookArgs) => {
        const { req, response } = hookArgs as {
          req: { user?: unknown }
          response: { user?: unknown } | null
        }
        if (!response?.user) return response
        const merged = mergeMeRolesFromStrategy(response.user as Record<string, unknown>, req.user)
        if (!merged) return response
        return { ...response, user: merged }
      },
    ],
    beforeChange: [
      ...prevList,
      async ({ data, operation, originalDoc, req }) => {
        const op = getInternalOperation()
        if (operation === 'create') {
          const kind = resolveInternalOperationKind(
            req.context as Record<string, unknown> | undefined
          )
          if (
            kind !== 'USER_CREATE' &&
            kind !== 'BOOTSTRAP' &&
            kind !== 'INVITATION_ACCEPT_PROVISION'
          ) {
            throw new Error('User.create stock DENY')
          }
          return data
        }
        // Soft-trash / restore — never trash Root Admin (stock UI bypasses deleteSharedUser).
        if (
          data &&
          typeof data === 'object' &&
          'deletedAt' in data &&
          (data as { deletedAt?: unknown }).deletedAt != null &&
          op?.kind !== 'USER_DELETE'
        ) {
          if (await resolveUserIsRoot(req.payload, originalDoc as { roles?: unknown } | null)) {
            throw new Error('Cannot delete Root Admin')
          }
        }
        // Email immutable — BA changeEmail disabled; Payload must match.
        if (
          originalDoc &&
          typeof originalDoc === 'object' &&
          'email' in originalDoc &&
          originalDoc.email != null
        ) {
          data = { ...data, email: originalDoc.email }
        }
        // Lifecycle flags are ALS-only — strip mass-assignment via REST/Local without override.
        if (op?.kind == null && data && typeof data === 'object') {
          const scrubbed = { ...data } as Record<string, unknown>
          delete scrubbed.provisioningStatus
          delete scrubbed.provisioningOperationId
          delete scrubbed.provisioningRequestHash
          data = scrubbed as typeof data
        }
        // New role assignments: Root blocked + ceiling (invite/roles UI already enforce;
        // stock PATCH /api/users/:id must not self-elevate beyond caller).
        if (data?.roles !== undefined) {
          const kind = resolveInternalOperationKind(
            req.context as Record<string, unknown> | undefined
          )
          const internalRoleAssign =
            kind === 'BOOTSTRAP' ||
            kind === 'USER_CREATE' ||
            kind === 'USER_PROVISIONING_FINALIZE' ||
            kind === 'INVITATION_ACCEPT_PROVISION' ||
            kind === 'USER_ROLES_UPDATE'
          // Roles are fixed at invite create — block mid-provisioning reassignment via REST.
          if (!internalRoleAssign) {
            const prov =
              originalDoc && typeof originalDoc === 'object' && 'provisioningStatus' in originalDoc
                ? String((originalDoc as { provisioningStatus?: unknown }).provisioningStatus ?? '')
                : ''
            if (prov === 'provisioning' || prov === 'deleting') {
              throw new APIError('Cannot change roles while user is provisioning', 403)
            }
          }
          const incoming = roleIdsOf(data.roles)
          if (incoming.length === 0) {
            throw new APIError('Role required', 400)
          }
          const previous = new Set(
            roleIdsOf(
              originalDoc && typeof originalDoc === 'object' && 'roles' in originalDoc
                ? originalDoc.roles
                : []
            )
          )
          const newlyAssigned: Array<{
            id?: string | number
            name?: string
            permissions?: unknown
          }> = []
          for (const id of incoming) {
            if (previous.has(id)) continue
            const role = await req.payload.findByID({
              collection: 'roles',
              id,
              depth: 0,
              overrideAccess: true,
            })
            if (isRootRole(role as { name?: string } | null) && !internalRoleAssign) {
              throw new APIError('Cannot assign Root role', 403)
            }
            newlyAssigned.push(
              role as { id?: string | number; name?: string; permissions?: unknown }
            )
          }
          if (!internalRoleAssign && newlyAssigned.length > 0) {
            try {
              assertRolesAssignable(newlyAssigned as never, req.user as never)
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Forbidden'
              throw new APIError(message, 403)
            }
          }
        }
        return data
      },
    ],
    afterChange: [
      ...prevAfterList,
      async ({ doc, previousDoc, req, operation }) => {
        if (operation !== 'update' || doc?.id == null) return
        const wasActive =
          previousDoc && typeof previousDoc === 'object'
            ? (previousDoc as { isActive?: boolean }).isActive !== false
            : true
        const nowActive = (doc as { isActive?: boolean }).isActive !== false
        if (!wasActive || nowActive) return
        const surface = readIamSurface(req.payload)
        if (!surface) return
        await surface.api.revokeAllUserSessions({ targetUserId: String(doc.id) })
      },
    ],
    beforeDelete: [
      ...prevDeleteList,
      async ({ id, req }) => {
        const op = getInternalOperation()
        if (op?.kind === 'USER_DELETE') return
        const doc = (await req.payload.findByID({
          collection: usersSlug,
          id: String(id),
          depth: 1,
          overrideAccess: true,
        })) as { roles?: unknown; email?: string } | null
        if (await resolveUserIsRoot(req.payload, doc)) {
          throw new Error('Cannot delete Root Admin')
        }
        // Stock / localized-delete must wipe Better Auth or re-invite hits unique email.
        if (op?.kind === 'FACADE_DELETE_USER') return
        try {
          const { createAuthUsersFacade } = await import('#iam/adapters/better-auth/auth-users')
          const { deleteBaUserPreferIdThenEmail } = await import(
            '#iam/adapters/better-auth/ensure-ba-user'
          )
          const facade = createAuthUsersFacade(options.getAuth())
          await runWithInternalOperation(
            { kind: 'FACADE_DELETE_USER', userId: String(id) },
            async () => {
              await deleteBaUserPreferIdThenEmail(facade, {
                userId: String(id),
                email: doc?.email,
              })
            }
          )
        } catch {
          // Do not block Payload delete if BA cleanup fails — invite reclaim still handles email.
        }
      },
    ],
  }
  const wrappedDelete = wrapModelAccess({
    collection: usersSlug,
    op: 'delete',
    packageOwned: true,
    hostAccess: users.access?.delete,
  })
  const wrappedUsersRead = wrapModelAccess({
    collection: usersSlug,
    op: 'read',
    packageOwned: true,
    hostAccess: users.access?.read,
  })
  const wrappedUsersUpdate = wrapModelAccess({
    collection: usersSlug,
    op: 'update',
    packageOwned: true,
    hostAccess: users.access?.update,
  })
  users.access = {
    ...users.access,
    admin: ({ req }) => canAccessAdmin(req.user as never),
    // Block /create + Create New. Invite = Drawer → /api/iam/invitations/invite. Hook still DENY stock create.
    create: () => false,
    read: async (ctx): Promise<any> => {
      const caller = ctx.req.user as { id?: string | number } | null | undefined
      if (ctx.id != null && caller?.id != null && String(ctx.id) === String(caller.id)) {
        const self = await loadUserForAccessCheck(ctx.req, usersSlug, String(ctx.id))
        if (!self || self.isActive === false) return false
        return true
      }
      const base = await wrappedUsersRead(ctx)
      if (base === false) return false
      if (ctx.id != null) {
        const target = await loadUserForAccessCheck(ctx.req, usersSlug, String(ctx.id))
        if (!canCallerAccessTargetUser(ctx.req.user as never, target)) return false
      }
      const clauses: Array<Record<string, unknown>> = []
      // List/find without id: hide users holding any role above caller's ceiling (incl. Root).
      // Do NOT hide `provisioning` anchors — otherwise invite conflicts with an invisible user.
      if (ctx.id == null) {
        const ceiling = resolveCallerCeiling(ctx.req.user as never)
        if (ceiling !== 'root') {
          try {
            const roles = await ctx.req.payload.find({
              collection: 'roles',
              limit: 500,
              depth: 0,
              overrideAccess: true,
            })
            const blocked = roleIdsOutsideCallerCeiling(roles.docs as never, ceiling)
            if (blocked.length > 0) {
              clauses.push({ roles: { not_in: blocked } })
            }
          } catch {
            // Fall back: at least hide Root by name lookup.
            try {
              const rootRoles = await ctx.req.payload.find({
                collection: 'roles',
                where: { name: { equals: ROOT_ROLE_NAME } },
                limit: 1,
                depth: 0,
                overrideAccess: true,
              })
              const rootRoleId = rootRoles.docs[0]?.id
              if (rootRoleId != null) {
                clauses.push({ roles: { not_in: [String(rootRoleId)] } })
              }
            } catch {
              // no extra filter
            }
          }
        }
      }
      if (clauses.length === 0) {
        if (base === true) return true
        if (typeof base === 'object' && base !== null) return base
        return true
      }
      const hide = clauses.length === 1 ? clauses[0]! : { and: clauses }
      if (base === true) return hide
      if (typeof base === 'object' && base !== null) {
        return { and: [base, hide] }
      }
      return hide
    },
    update: async (ctx) => {
      // Bulk PATCH /api/users (no id) would skip per-doc ceiling / Root gates.
      if (ctx.id == null) return false
      const base = await wrappedUsersUpdate(ctx)
      if (base === false) return false
      const target = await loadUserForAccessCheck(ctx.req, usersSlug, String(ctx.id))
      if (!canCallerAccessTargetUser(ctx.req.user as never, target)) return false
      return base
    },
    delete: async (ctx) => {
      // No id: schema/UI permission probe — allow when role has users.delete.
      // Actual bulk delete is blocked by `disableBulkDelete`.
      if (ctx.id == null) {
        return wrappedDelete(ctx)
      }
      const caller = ctx.req.user as { id?: string | number } | null | undefined
      if (caller?.id != null && String(ctx.id) === String(caller.id)) {
        return false
      }
      const target = await loadUserForAccessCheck(ctx.req, usersSlug, String(ctx.id))
      if (!canCallerAccessTargetUser(ctx.req.user as never, target)) return false
      if (await resolveUserIsRoot(ctx.req.payload, target as { roles?: unknown })) return false
      return wrappedDelete(ctx)
    },
    // Auth lock/unlock is Better Auth — deny Payload unlock surface.
    unlock: () => false,
  }
  return users
}
