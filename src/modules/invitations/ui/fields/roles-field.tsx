'use client'

import { FieldLabel, SelectInput, useFormFields } from '@payloadcms/ui'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

type RoleOption = { label: string; value: string }

/**
 * Sidebar Role — same multi SelectInput as Invite drawer, read-only.
 * Options come from virtual `roleOptions` (afterRead) — no client fetch flicker.
 */
export default function InvitationRolesField() {
  const { t } = useIamTranslation()
  const roleIds = useFormFields(([fields]) => {
    const raw = fields.authorizedRoleIds?.value
    if (!Array.isArray(raw)) return [] as string[]
    return raw.map(String).filter(Boolean)
  })

  const options = useFormFields(([fields]) => {
    const raw = fields.roleOptions?.value
    if (!Array.isArray(raw)) return [] as RoleOption[]
    return raw
      .map((row) => {
        if (!row || typeof row !== 'object') return null
        const r = row as { label?: unknown; value?: unknown }
        if (r.value == null) return null
        return {
          label: String(r.label ?? r.value),
          value: String(r.value),
        }
      })
      .filter((o): o is RoleOption => o != null)
  })

  const resolved = options.length > 0 ? options : roleIds.map((id) => ({ label: id, value: id }))

  return (
    <div className='field-type select w-full [&_.rs__control]:pointer-events-none [&_.react-select__control]:pointer-events-none'>
      <FieldLabel label={t('iam:rbac:fieldRole')} path='iam-invite-role' />
      <SelectInput
        hasMany
        isClearable={false}
        name='iam-invite-role'
        onChange={() => {
          // read-only
        }}
        options={resolved}
        path='iam-invite-role'
        readOnly
        value={roleIds}
      />
    </div>
  )
}
