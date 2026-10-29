import type { CollectionConfig, Field, Tab } from 'payload'
import { APIError } from 'payload'
import { resolveInternalOperationKind } from '#iam/adapters/payload/operation-als'
import { normalizeRbacRegisterItem } from '#iam/core/rbac/register-model'
import { ROOT_ROLE_NAME } from '#iam/modules/bootstrap'
import { effectiveIsRoot } from '#iam/modules/rbac/access/can'
import {
  assertRoleEditable,
  assertRolePermissionsWithinCeiling,
} from '#iam/modules/rbac/domain/ceiling'
import { roleUsersCountAfterRead } from '#iam/modules/rbac/hooks/role-users-count-after-read.hook'
import { lockListColumns, withOwnedTimestamps } from '#iam/modules/users'
import { i18n } from '#iam/shared/i18n/i18n-label'
import type { RbacRegisterTab } from '#iam/types/config'

export const rolesCollectionSlug = 'roles' as const

const ROLES_LIST_COLUMNS = new Set(['name', 'users', 'createdAt', 'updatedAt'])

const ROLE_IDENTITY_ROW_CLASS = 'iam-role-identity-row'

const ROLE_USERS_COUNT_CLASS =
  'iam-role-users-count shrink-0 [&_input]:text-left [&_input]:font-medium'

const ROLE_PERMS_TABS_CLASS = 'iam-role-perms-tabs'

const ROLE_MATRIX_FIELD_CLASS = 'iam-role-matrix-field'

const ROLE_USERS_GROUP_CLASS = 'iam-role-users-group'

/** Payload 3.90 typings omit `admin.className`; admin UI still applies it for IAM layout CSS. */
function iamUiField(config: {
  name: string
  className?: string
  Field: string
  custom?: Record<string, unknown>
}): Field {
  return {
    name: config.name,
    type: 'ui',
    admin: {
      className: config.className,
      custom: config.custom,
      components: { Field: config.Field },
    },
  } as Field
}

function registerPermissionTabs(tabs: RbacRegisterTab[] | undefined): Tab[] {
  if (!tabs?.length) return []
  return tabs
    .filter((t) => t.tab.trim() && t.items?.some((i) => i.id))
    .map((t, index) => ({
      label: t.tab,
      fields: [
        iamUiField({
          name: `permissionsRegisterUi_${index}`,
          className: ROLE_MATRIX_FIELD_CLASS,
          custom: {
            rbacRegisterTab: t.tab,
            rbacRegisterItems: t.items.map((item) => normalizeRbacRegisterItem(item, t.tab)),
          },
          Field: '@klnap/payload-iam/client#PermissionsRegister',
        }),
      ],
    }))
}

function permissionMatrixTabs(register?: RbacRegisterTab[]): Tab[] {
  return [
    {
      label: i18n('iam:rbac:roleMatrixTabCollections'),
      fields: [
        {
          name: 'permissions',
          type: 'json',
          label: i18n('iam:rbac:fieldPermission'),
          required: true,
          defaultValue: {
            collections: {},
            globals: {},
            register: {},
          },
          admin: {
            className: ROLE_MATRIX_FIELD_CLASS,
            components: {
              Field: '@klnap/payload-iam/client#PermissionsCollections',
            },
          } as Field['admin'],
        } as Field,
      ],
    },
    {
      label: i18n('iam:rbac:roleMatrixTabGlobals'),
      fields: [
        iamUiField({
          name: 'permissionsGlobalsUi',
          className: ROLE_MATRIX_FIELD_CLASS,
          Field: '@klnap/payload-iam/client#PermissionsGlobals',
        }),
      ],
    },
    {
      label: i18n('iam:rbac:roleMatrixTabAccess'),
      fields: [
        iamUiField({
          name: 'permissionsAuthUi',
          className: ROLE_MATRIX_FIELD_CLASS,
          Field: '@klnap/payload-iam/client#PermissionsAuth',
        }),
      ],
    },
    ...registerPermissionTabs(register),
  ]
}

/** Role edit — sidebar (name, users, description) + shell tabs (Permissions matrix, Users table). */
export function createRolesCollection(register?: RbacRegisterTab[]): CollectionConfig {
  return {
    slug: rolesCollectionSlug,
    versions: false,
    labels: {
      singular: i18n('iam:rbac:collectionRoleSingular'),
      plural: i18n('iam:rbac:collectionRolePlural'),
    },
    admin: {
      useAsTitle: 'name',
      defaultColumns: ['name', 'users', 'createdAt', 'updatedAt'],
      group: false,
      // Hide Root from Roles list (still loadable by ID when needed)
      baseFilter: () => ({ name: { not_equals: ROOT_ROLE_NAME } }),
    },
    access: {
      read: ({ req }) => Boolean(req.user),
      create: ({ req }) => Boolean(req.user),
      update: ({ req }) => Boolean(req.user),
      delete: () => false,
    },
    fields: lockListColumns(
      withOwnedTimestamps([
        {
          type: 'row',
          admin: {
            className: ROLE_IDENTITY_ROW_CLASS,
          },
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              admin: { width: '70%' },
            },
            {
              name: 'users',
              type: 'number',
              label: i18n('iam:rbac:fieldNumberOfUsers'),
              virtual: true,
              admin: {
                width: '30%',
                readOnly: true,
                className: ROLE_USERS_COUNT_CLASS,
                components: {
                  Cell: '@klnap/payload-iam/rsc#RoleUsersCell',
                },
              },
              hooks: {
                afterRead: [roleUsersCountAfterRead],
              },
            },
          ],
        },
        {
          name: 'description',
          type: 'richText',
          admin: {
            className: 'iam-role-description',
          },
        },
        {
          type: 'tabs',
          admin: {
            className: ROLE_PERMS_TABS_CLASS,
          },
          tabs: permissionMatrixTabs(register),
        },
        {
          type: 'group',
          name: 'roleAssignedUsers',
          label: i18n('iam:rbac:roleEditTabUsers'),
          admin: {
            className: ROLE_USERS_GROUP_CLASS,
          },
          fields: [
            {
              name: 'roleUsersUi',
              type: 'ui',
              admin: {
                components: {
                  Field: '@klnap/payload-iam/client#RoleUsersList',
                },
              },
            },
          ],
        },
      ]),
      ROLES_LIST_COLUMNS
    ),
    timestamps: true,
    hooks: {
      beforeChange: [
        ({ data, operation, originalDoc, req }) => {
          const kind = resolveInternalOperationKind(
            req.context as Record<string, unknown> | undefined
          )
          if (operation === 'create') {
            const name = typeof data?.name === 'string' ? data.name.trim() : ''
            if (name === ROOT_ROLE_NAME && kind !== 'BOOTSTRAP') {
              throw new APIError(`Role.create must not use reserved name "${ROOT_ROLE_NAME}"`, 403)
            }
            if (kind !== 'BOOTSTRAP') {
              assertRolePermissionsWithinCeiling(
                data?.permissions as never,
                req.user as never,
                'create'
              )
            }
            return data
          }
          if (operation === 'update') {
            const incomingName = typeof data?.name === 'string' ? data.name.trim() : ''
            const wasRoot =
              typeof originalDoc?.name === 'string' && originalDoc.name.trim() === ROOT_ROLE_NAME
            if (wasRoot) {
              // Root role identity is fixed; permissions JSON is ignored at runtime
              // (effectiveIsRoot is name-based) — still refuse non-Root callers editing it.
              if (!effectiveIsRoot(req.user as never)) {
                throw new APIError('Cannot modify Root role', 403)
              }
              return {
                ...data,
                name: ROOT_ROLE_NAME,
              }
            }
            // Prevent privilege escalation: rename Editor → Root must not mint a second Root.
            if (incomingName === ROOT_ROLE_NAME) {
              throw new APIError(`Cannot rename role to reserved name "${ROOT_ROLE_NAME}"`, 403)
            }
            // Caller may only edit roles already within their ceiling (blocks wiping Senior).
            try {
              assertRoleEditable(originalDoc as never, req.user as never)
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Forbidden'
              throw new APIError(message, 403)
            }
            assertRolePermissionsWithinCeiling(
              data?.permissions as never,
              req.user as never,
              'update'
            )
          }
          return data
        },
      ],
      beforeDelete: [
        async ({ id, req }) => {
          const doc = await req.payload.findByID({
            collection: 'roles',
            id,
            depth: 0,
            overrideAccess: true,
          })
          const roleName =
            typeof (doc as unknown as { name?: string } | null)?.name === 'string'
              ? (doc as unknown as { name: string }).name.trim()
              : ''
          if (roleName === ROOT_ROLE_NAME) {
            throw new Error('Cannot delete Root role')
          }
        },
      ],
    },
  }
}
