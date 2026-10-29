'use client'

import { Button } from '@base-ui/react/button'
import { FieldLabel, TextInput, useField } from '@payloadcms/ui'
import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { cx } from 'tailwind-variants'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { UserAvatarMark } from '#iam/shared/ui/admin/user-avatar-mark'
import { PadlockClosedIcon, PadlockOpenIcon } from '#iam/shared/ui/icons/lock-icons'

const lockToggleClass = cx(
  'absolute right-2 top-1/2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center',
  'rounded-[var(--style-radius-s,4px)] border-0 bg-transparent p-0',
  'text-[var(--theme-elevation-600)] hover:bg-[var(--theme-elevation-100)] hover:text-[var(--theme-elevation-800)]',
  'focus-visible:bg-[var(--theme-elevation-100)] focus-visible:text-[var(--theme-elevation-800)]',
  '[&_svg]:block [&_svg]:h-[18px] [&_svg]:w-[18px]'
)

/** User edit — avatar; full name locked until unlock icon; email read-only. */
export default function UserIdentityField() {
  const { t } = useIamTranslation()
  const { value: fullName, setValue } = useField<string>({ path: 'fullName' })
  const { value: email } = useField<string>({ path: 'email' })
  const [unlocked, setUnlocked] = useState(false)
  const name = typeof fullName === 'string' ? fullName : ''
  const mail = typeof email === 'string' ? email : ''

  const lockLabel = unlocked ? t('iam:rbac:userFullNameLock') : t('iam:rbac:userFullNameUnlock')

  return (
    <div className='field-type flex items-start gap-12 mb-[calc(var(--base)*0.5)]'>
      <UserAvatarMark name={name.trim() || mail.trim()} size='lg' />
      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='mb-[var(--spacing-field,1.5rem)] last:mb-0'>
          <FieldLabel label={t('iam:rbac:fieldFullName')} path='fullName' required />
          <div className='relative w-full [&_.field-type.text]:m-0 [&_input]:pr-11'>
            <TextInput
              onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
              path='fullName'
              readOnly={!unlocked}
              required
              value={name}
            />
            <Button
              aria-label={lockLabel}
              className={lockToggleClass}
              onClick={() => setUnlocked((v) => !v)}
              title={lockLabel}
              type='button'
            >
              {unlocked ? <PadlockOpenIcon /> : <PadlockClosedIcon />}
            </Button>
          </div>
        </div>
        <div className='mb-[var(--spacing-field,1.5rem)] last:mb-0'>
          <FieldLabel label={t('iam:rbac:fieldEmail')} path='email' />
          <TextInput onChange={() => undefined} path='email' readOnly value={mail} />
        </div>
      </div>
    </div>
  )
}
