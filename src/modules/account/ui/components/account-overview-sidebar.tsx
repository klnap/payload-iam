'use client'

import { FieldLabel, TextInput } from '@payloadcms/ui'
import type { ChangeEvent } from 'react'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import type { AccountOverviewData } from './account-overview-panel'
import AccountPanelLanguageSettings from './account-panel-language-settings'

type LanguageOption = { label: string; value: string }

type Props = {
  data: AccountOverviewData
  languageOptions: LanguageOption[]
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

/** Sidebar column — same fields as `/collections/users/:id` account area (without Active). */
export default function AccountOverviewSidebar({ data, languageOptions }: Props) {
  const { t } = useIamTranslation()
  const roles = data.roleLabels.trim() || '—'

  return (
    <div className='document-fields__sidebar-wrap'>
      <div className='document-fields__sidebar'>
        <div className='document-fields__sidebar-fields'>
          <div className='render-fields'>
            <div className={fieldStack}>
              <FieldLabel label={t('iam:rbac:fieldRole')} path='roles' required />
              <ReadOnlyTextInput path='roles' value={roles} />
            </div>
            <div className={fieldStack}>
              <FieldLabel label={t('iam:rbac:accountFieldMemberSince')} path='memberSince' />
              <ReadOnlyTextInput path='memberSince' value={data.memberSince} />
            </div>
            <AccountPanelLanguageSettings languageOptions={languageOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}
