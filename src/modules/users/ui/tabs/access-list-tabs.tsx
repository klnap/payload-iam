import type { LabelFunction, ViewDescriptionServerProps } from 'payload'
import type { InviteRoleOption } from '#iam/modules/invitations/index'
import { filterRolesWithinCeiling, type RoleLike } from '#iam/modules/rbac'
import { resolvePayloadLabel } from '#iam/shared/i18n/i18n-label'
import AccessListTabsClient from './access-list-tabs-client'

/**
 * Server Description — loads invite role options once.
 * Client shell handles list tabs + drawer on `/collections/{users|invitations|roles}`.
 * Options capped to roles whose permissions ⊆ caller's.
 */
export default async function AccessListTabs(props: ViewDescriptionServerProps) {
  const { payload, user, i18n } = props
  const labelArgs = { i18n, t: i18n.t } as Parameters<LabelFunction>[0]

  const usersConfig = payload.config.collections.find((c) => c.slug === 'users')
  const invitationsConfig = payload.config.collections.find((c) => c.slug === 'invitations')
  const rolesConfig = payload.config.collections.find((c) => c.slug === 'roles')
  const invitationsEnabled = Boolean(invitationsConfig)
  const usersListLabel = resolvePayloadLabel(usersConfig?.labels?.plural, labelArgs)
  const invitationsListLabel = resolvePayloadLabel(invitationsConfig?.labels?.plural, labelArgs)
  const rolesListLabel = resolvePayloadLabel(rolesConfig?.labels?.plural, labelArgs)

  let roleOptions: InviteRoleOption[] = []

  if (user) {
    try {
      const found = await payload.find({
        collection: 'roles',
        depth: 0,
        limit: 100,
        overrideAccess: true,
      })
      roleOptions = filterRolesWithinCeiling(found.docs as RoleLike[], user as never).map((r) => ({
        label: String(r.name?.trim() || r.id),
        value: String(r.id),
      }))
    } catch {
      roleOptions = []
    }
  }

  return (
    <AccessListTabsClient
      invitationsEnabled={invitationsEnabled}
      invitationsListLabel={invitationsListLabel}
      roleOptions={roleOptions}
      rolesListLabel={rolesListLabel}
      usersListLabel={usersListLabel}
    />
  )
}
