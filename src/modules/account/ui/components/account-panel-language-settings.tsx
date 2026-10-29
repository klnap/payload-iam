'use client'

import { FieldLabel, ReactSelect, useTranslation } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

type LanguageOption = { label: string; value: string }

type Props = {
  languageOptions: LanguageOption[]
}

/** Admin UI language — `/account` overview sidebar. */
export default function AccountPanelLanguageSettings({ languageOptions }: Props) {
  const router = useRouter()
  const { i18n, switchLanguage } = useTranslation()
  const { t } = useIamTranslation()

  if (languageOptions.length <= 1) return null

  return (
    <div className='field-type select mb-[var(--spacing-field,1.5rem)] last:mb-0'>
      <FieldLabel htmlFor='language-select' label={t('iam:rbac:accountLanguage')} path='language' />
      <div className='field-type__wrap'>
        <ReactSelect
          inputId='language-select'
          isClearable={false}
          onChange={async (option) => {
            const selected = (Array.isArray(option) ? option[0] : option) as
              | LanguageOption
              | null
              | undefined
            if (!selected?.value || switchLanguage == null) return
            if (selected.value === i18n.language) return
            await switchLanguage(selected.value as Parameters<typeof switchLanguage>[0])
            router.refresh()
          }}
          options={languageOptions}
          value={languageOptions.find((language) => language.value === i18n.language)}
        />
      </div>
    </div>
  )
}
