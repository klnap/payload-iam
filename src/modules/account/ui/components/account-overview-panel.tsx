'use client'

import { FieldLabel, TextInput } from '@payloadcms/ui'
import type { ChangeEvent } from 'react'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { UserAvatarMark } from '#iam/shared/ui/admin/user-avatar-mark'

export type AccountOverviewData = {
  fullName: string
  email: string
  roleLabels: string
  memberSince: string
}

type Props = {
  data: AccountOverviewData
  /** Users edit Account tab: UserIdentityField is above — hide duplicate hero. */
  showHero?: boolean
}

const fieldStack = 'mb-[var(--spacing-field,1.5rem)] last:mb-0'
const textInputWrap = 'relative w-full [&_.field-type.text]:m-0'

const noopChange = (_e: ChangeEvent<HTMLInputElement>) => undefined

function ReadOnlyTextInput({ path, value }: { path: string; value: string }) {
  return (
    <div className={textInputWrap}>
      <TextInput onChange={noopChange} path={path} readOnly value={value} />
    </div>
  )
}

/** Account tab main column — identity row only (sidebar is `AccountOverviewSidebar`). */
export default function AccountOverviewPanel({ data, showHero = true }: Props) {
  const { t } = useIamTranslation()
  const displayName = data.fullName.trim() || data.email.trim() || '—'
  const fullName = data.fullName.trim() || '—'
  const email = data.email.trim() || '—'
  const roles = data.roleLabels.trim() || '—'

  if (!showHero) {
    return (
      <section aria-labelledby='iam-account-overview-heading'>
        <h2 className='sr-only' id='iam-account-overview-heading'>
          {t('iam:rbac:accountTabOverview')}
        </h2>
        <dl className='m-0 grid gap-5'>
          <div>
            <dt className='m-0 text-[0.6875rem] uppercase tracking-wide text-[var(--theme-elevation-500)]'>
              {t('iam:rbac:accountFieldRoles')}
            </dt>
            <dd className='mt-1 mb-0 text-[0.9375rem]'>{roles}</dd>
          </div>
        </dl>
      </section>
    )
  }

  return (
    <div className='field-type' aria-labelledby='iam-account-overview-heading' role='region'>
      <h2 className='sr-only' id='iam-account-overview-heading'>
        {t('iam:rbac:accountNav')}
      </h2>
      <div className='field-type flex items-start gap-12 mb-[calc(var(--base)*0.5)]'>
        <UserAvatarMark name={displayName} size='lg' />
        <div className='flex min-w-0 flex-1 flex-col'>
          <div className={fieldStack}>
            <FieldLabel label={t('iam:rbac:fieldFullName')} path='fullName' required />
            <ReadOnlyTextInput path='fullName' value={fullName} />
          </div>
          <div className={fieldStack}>
            <FieldLabel label={t('iam:rbac:fieldEmail')} path='email' />
            <ReadOnlyTextInput path='email' value={email} />
          </div>
        </div>
      </div>
    </div>
  )
}
