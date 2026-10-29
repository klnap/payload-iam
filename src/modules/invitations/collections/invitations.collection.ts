import type { CollectionConfig } from 'payload'
import {
  INVITATION_STATUSES,
  TERMINAL_REASONS,
} from '#iam/modules/invitations/domain/state-machine'
import { lockListColumns, withOwnedTimestamps } from '#iam/modules/users'
import { readIamSurface } from '#iam/plugin/runtime/payload-iam-surface'
import { i18n } from '#iam/shared/i18n/i18n-label'

export const invitationsCollectionSlug = 'invitations' as const

const INVITATIONS_LIST_COLUMNS = new Set(['email', 'fullName', 'status', 'expiresAt', 'updatedAt'])

export function createInvitationsCollection(): CollectionConfig {
  return {
    slug: invitationsCollectionSlug,
    versions: false,
    trash: false,
    labels: {
      singular: i18n('iam:rbac:collectionInvitationSingular'),
      plural: i18n('iam:rbac:collectionInvitationPlural'),
    },
    admin: {
      useAsTitle: 'email',
      defaultColumns: ['email', 'fullName', 'status', 'expiresAt', 'updatedAt'],
      // Out of sidebar nav (AccessListTabs). Not admin.hidden — that drops visibleEntities → list 404.
      group: false,
      components: {
        Description: '@klnap/payload-iam/rsc#AccessListTabs',
      },
      // @ts-expect-error Payload admin option used by RBAC UI
      disableDuplicate: true,
    },
    access: {
      create: () => false,
      // Lifecycle fields locked in hooks; stock update denied (trash disabled).
      update: ({ req }) =>
        Boolean(req.user) && (req.user as { type?: string } | null)?.type !== 'service',
      delete: ({ req }) =>
        Boolean(req.user) && (req.user as { type?: string } | null)?.type !== 'service',
      read: ({ req }) =>
        Boolean(req.user) && (req.user as { type?: string } | null)?.type !== 'service',
    },
    hooks: {
      beforeDelete: [
        async ({ req, id }) => {
          const doc = (await req.payload.findByID({
            collection: invitationsCollectionSlug,
            id,
            depth: 0,
            overrideAccess: true,
          })) as { status?: string } | null
          if (doc?.status !== 'pending') return
          const actorId = req.user?.id
          if (!actorId) return
          const api = readIamSurface(req.payload)?.api
          if (!api) return
          await api.revokeInvitation({
            invitationId: String(id),
            actor: { type: 'human', userId: String(actorId) },
          })
        },
      ],
      beforeChange: [
        async ({ data, operation }) => {
          const { getInternalOperation } = await import('#iam/adapters/payload/operation-als')
          const op = getInternalOperation()
          if (
            op?.kind === 'INVITATION_ISSUE' ||
            op?.kind === 'INVITATION_RESEND' ||
            op?.kind === 'INVITATION_REVOKE' ||
            op?.kind === 'INVITATION_EXPIRE' ||
            op?.kind === 'INVITATION_ACCEPT_PROVISION' ||
            op?.kind === 'INVITATION_ROLES_UPDATE' ||
            op?.kind === 'USER_DELETE' ||
            op?.kind === 'USER_PROVISIONING_UPDATE' ||
            op?.kind === 'RECONCILE_REPAIR' ||
            op?.kind === 'BOOTSTRAP'
          ) {
            return data
          }
          if (operation === 'update') {
            throw new Error('Invitation fields are read-only')
          }
          return data
        },
      ],
    },
    fields: lockListColumns(
      withOwnedTimestamps(
        [
          {
            name: 'email',
            type: 'email',
            required: true,
            index: true,
            admin: { readOnly: true },
          },
          {
            name: 'fullName',
            type: 'text',
            label: i18n('iam:rbac:fieldFullName'),
            admin: { readOnly: true },
          },
          {
            name: 'inviteLink',
            type: 'text',
            admin: {
              readOnly: true,
              components: {
                Field: '@klnap/payload-iam/client#InvitationInviteLinkField',
              },
            },
            access: {
              // Token must never be readable via REST — only ephemeral inviteUrl on issue/resend.
              create: () => false,
              update: () => false,
            },
            // Defense in depth: never return a stored accept token via REST/admin read.
            hooks: {
              afterRead: [
                ({ value }) => {
                  if (typeof value !== 'string' || !value.includes('token=')) return value
                  try {
                    const url = new URL(value)
                    url.searchParams.delete('token')
                    return url.toString()
                  } catch {
                    return value.replace(/([?&])token=[^&]*/g, '').replace(/\?$/, '')
                  }
                },
              ],
            },
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            options: INVITATION_STATUSES.map((s) => ({ label: s, value: s })),
            defaultValue: 'pending',
            index: true,
            admin: {
              position: 'sidebar',
              readOnly: true,
            },
          },
          {
            name: 'expiresAt',
            type: 'date',
            required: true,
            index: true,
            admin: {
              position: 'sidebar',
              readOnly: true,
              date: { pickerAppearance: 'dayAndTime' },
              components: {
                Field: '@klnap/payload-iam/client#InvitationExpiresAtField',
              },
            },
          },
          {
            name: 'roleOptions',
            type: 'json',
            virtual: true,
            admin: { hidden: true, readOnly: true },
            hooks: {
              afterRead: [
                async ({ data, req }) => {
                  const ids = Array.isArray(data?.authorizedRoleIds)
                    ? data.authorizedRoleIds.map(String).filter(Boolean)
                    : []
                  if (ids.length === 0) return []
                  try {
                    const found = await req.payload.find({
                      collection: 'roles',
                      where: { id: { in: ids } },
                      limit: ids.length,
                      depth: 0,
                      overrideAccess: true,
                    })
                    const nameById = new Map(
                      (found.docs as Array<{ id?: string; name?: string }>).map((r) => [
                        String(r.id),
                        String(r.name ?? r.id),
                      ])
                    )
                    return ids.map((id) => ({
                      value: id,
                      label: nameById.get(id) ?? id,
                    }))
                  } catch {
                    return ids.map((id) => ({ value: id, label: id }))
                  }
                },
              ],
            },
          },
          {
            name: 'rolesDisplay',
            type: 'ui',
            admin: {
              position: 'sidebar',
              components: {
                Field: '@klnap/payload-iam/client#InvitationRolesField',
              },
            },
          },
          {
            name: 'renewInvite',
            type: 'ui',
            admin: {
              position: 'sidebar',
              condition: (_data, siblingData) => String(siblingData?.status ?? '') === 'expired',
              components: {
                Field: '@klnap/payload-iam/client#InvitationRenewField',
              },
            },
          },
          // Persistence fields — hidden from document UI.
          {
            name: 'userId',
            type: 'text',
            required: false,
            index: true,
            admin: { hidden: true, readOnly: true },
          },
          {
            name: 'authorizedRoleIds',
            type: 'json',
            required: true,
            admin: { hidden: true, readOnly: true },
          },
          {
            name: 'version',
            type: 'number',
            required: true,
            defaultValue: 1,
            admin: { hidden: true, readOnly: true },
          },
          {
            name: 'activeUserId',
            type: 'text',
            required: false,
            index: true,
            admin: { hidden: true, readOnly: true },
          },
          {
            name: 'terminalReason',
            type: 'select',
            options: TERMINAL_REASONS.map((r) => ({ label: r, value: r })),
            admin: { hidden: true, readOnly: true },
          },
        ],
        { trash: false }
      ),
      INVITATIONS_LIST_COLUMNS
    ),
    timestamps: true,
  }
}
