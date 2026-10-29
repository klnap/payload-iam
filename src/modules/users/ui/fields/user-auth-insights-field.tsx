'use client'

import { useFormFields } from '@payloadcms/ui'
import { cx } from 'tailwind-variants'
import type { UserAuthAccountInsights } from '#iam/modules/users/domain/user-auth-account-insights'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function readInsights(raw: unknown): UserAuthAccountInsights | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as UserAuthAccountInsights
  return {
    hasPassword: Boolean(o.hasPassword),
    hasGoogle: Boolean(o.hasGoogle),
    googleLoginEnabled: Boolean(o.googleLoginEnabled),
    lastLoginAt: typeof o.lastLoginAt === 'string' ? o.lastLoginAt : null,
  }
}

/** Security tab — auth linkage + last activity (from server afterRead). */
export default function UserAuthInsightsField() {
  const { t } = useIamTranslation()
  const insights = useFormFields(([fields]) => readInsights(fields.authAccountInsights?.value))

  if (!insights) return null

  const rows: Array<{ label: string; value: string }> = [
    {
      label: t('iam:rbac:userInsightPasswordLogin'),
      value: insights.hasPassword
        ? t('iam:rbac:userInsightLinked')
        : t('iam:rbac:userInsightNotLinked'),
    },
  ]

  if (insights.googleLoginEnabled) {
    rows.push({
      label: t('iam:rbac:userInsightGoogle'),
      value: insights.hasGoogle
        ? t('iam:rbac:userInsightLinked')
        : t('iam:rbac:userInsightNotLinked'),
    })
  }

  rows.push({
    label: t('iam:rbac:userInsightLastLogin'),
    value: formatWhen(insights.lastLoginAt),
  })

  return (
    <section
      aria-labelledby='iam-user-auth-insights-title'
      className={cx(
        'field-type m-0 border border-[var(--theme-elevation-150)]',
        'rounded-[var(--style-radius-s,4px)] bg-[var(--theme-elevation-50)]',
        'px-5 py-[1.125rem]'
      )}
    >
      <p
        className='m-0 mb-4 text-xl tracking-wide text-[var(--theme-elevation-800)]'
        id='iam-user-auth-insights-title'
      >
        {t('iam:rbac:userInsightSectionTitle')}
      </p>
      <dl className='mt-8 flex flex-col gap-4  p-0'>
        {rows.map((row) => (
          <div
            className='grid grid-cols-[minmax(8rem,11rem)_1fr] items-baseline gap-x-4 gap-y-3'
            key={row.label}
          >
            <dt className='m-0 text-lg text-[var(--theme-elevation-600)]'>{row.label}</dt>
            <dd className='m-0 text-lg text-[var(--theme-elevation-600)'>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
