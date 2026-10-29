'use client'

import { CopyToClipboard, TextInput, useField, useFormFields } from '@payloadcms/ui'
import { cx } from 'tailwind-variants'
import { tIam } from '#iam/shared/i18n/t-iam'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

/** Invite link chrome — full URL with token is returned once by invite/resend API, not stored. */
export default function InvitationInviteLinkField() {
  const { t } = useIamTranslation()
  const status = useFormFields(([fields]) =>
    fields.status?.value != null ? String(fields.status.value) : ''
  )
  const { value } = useField<string>({ path: 'inviteLink' })
  const renewable = status === 'pending' || status === 'expired'
  const url = typeof value === 'string' ? value.trim() : ''

  return (
    <div className='field-type mt-6'>
      <div
        className={cx(
          'bg-[var(--theme-elevation-50)] p-[calc(var(--base)*2)]',
          'max-md:p-[var(--base)]',
          '[&_.field-type.text_.field-type__wrap]:relative',
          '[&_.field-type.text_input]:pr-[calc(var(--base)*2.25)]'
        )}
      >
        <TextInput
          AfterInput={
            url ? (
              <span className='absolute right-[calc(var(--base)/2)] top-1/2 z-[1] inline-flex -translate-y-1/2 items-center'>
                <CopyToClipboard value={url} />
              </span>
            ) : null
          }
          label={tIam(t, 'iam:rbac:inviteLinkLabel')}
          onChange={() => undefined}
          path='inviteLink'
          placeholder={
            renewable
              ? tIam(t, 'iam:rbac:inviteLinkUnavailable')
              : tIam(t, 'iam:rbac:inviteLinkRenewUnavailable')
          }
          readOnly
          value={url}
        />
      </div>
    </div>
  )
}
