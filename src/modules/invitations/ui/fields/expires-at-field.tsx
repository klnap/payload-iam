'use client'

import { TextInput, useConfig, useField, useTranslation } from '@payloadcms/ui'
import { formatDate } from '@payloadcms/ui/shared'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

/** Read-only text — same admin.dateFormat as Created / Last Modified. */
export default function InvitationExpiresAtField({ path }: { path: string; field?: unknown }) {
  const { value } = useField<string | Date | null>({ path })
  const { t } = useIamTranslation()
  const { i18n } = useTranslation()
  const {
    config: {
      admin: { dateFormat },
    },
  } = useConfig()

  const display =
    value != null && value !== ''
      ? formatDate({
          date: value,
          i18n,
          pattern: dateFormat || 'MMMM do yyyy, HH:mm',
        })
      : ''

  return (
    <TextInput
      label={t('iam:rbac:fieldInviteExpiresAt')}
      onChange={() => undefined}
      path={`${path}-display`}
      readOnly
      value={/loading/i.test(display) ? '' : display}
    />
  )
}
