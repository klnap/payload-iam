'use client'

import { useConfig } from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import type { ReactNode } from 'react'
import { startTransition } from 'react'
import { cx } from 'tailwind-variants'
import type { AccountTabVisibility } from '#iam/modules/account/ui/account-tab-visibility'
import { visibleAccountTabs } from '#iam/modules/account/ui/account-tab-visibility'
import {
  type AccountTabId,
  accountViewPath,
  parseAccountTabFromPath,
} from '#iam/modules/account/ui/tabs'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

type Props = {
  active?: AccountTabId
  children: ReactNode
  tabVisibility: AccountTabVisibility
}

/** Same DOM as Payload `tabs` field on users edit (`iam-user-admin-tabs`). */
export default function AccountUserAdminTabs({
  active: activeFallback,
  children,
  tabVisibility,
}: Props) {
  const { t } = useIamTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { config } = useConfig()
  const adminRoute = config?.routes?.admin ?? '/admin'

  const tabs = visibleAccountTabs(tabVisibility)
  const activeTab = parseAccountTabFromPath(pathname, adminRoute) ?? activeFallback
  if (!activeTab || !tabs.some((tab) => tab.id === activeTab)) return null

  const go = (next: AccountTabId) => {
    if (next === activeTab) return
    const path = accountViewPath(next)
    startTransition(() => {
      router.push(
        formatAdminURL({
          adminRoute: adminRoute as `/${string}`,
          path: path as `/${string}`,
        })
      )
    })
  }

  return (
    <div className='field-type iam-user-admin-tabs tabs-field'>
      <div className='tabs-field__tabs-wrap'>
        <div className='tabs-field__tabs'>
          {tabs.map((tab) => {
            const active = tab.id === activeTab
            return (
              <button
                className={cx('tabs-field__tab-button', active && 'tabs-field__tab-button--active')}
                key={tab.id}
                onClick={() => go(tab.id)}
                type='button'
              >
                {t(tab.labelKey)}
              </button>
            )
          })}
        </div>
      </div>
      <div className='tabs-field__content-wrap'>
        <div className='tabs-field__tab'>
          <div className='render-fields'>{children}</div>
        </div>
      </div>
    </div>
  )
}
