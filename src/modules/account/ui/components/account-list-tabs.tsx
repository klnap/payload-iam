'use client'

import { useConfig } from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { startTransition } from 'react'
import { cx } from 'tailwind-variants'
import {
  ACCOUNT_TABS,
  type AccountTabId,
  accountViewPath,
  parseAccountTabFromPath,
} from '#iam/modules/account/ui/tabs'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { AdminTabNav } from '#iam/shared/ui/admin/admin-tab-nav'

type Props = {
  /** Server-provided fallback when pathname is not ready yet. */
  active?: AccountTabId
}

/** Overview · Sessions · Security — same tab strip as access hub lists. */
export default function AccountListTabs({ active: activeFallback }: Props) {
  const { t } = useIamTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const { config } = useConfig()
  const adminRoute = config?.routes?.admin ?? '/admin'

  const activeTab = parseAccountTabFromPath(pathname, adminRoute) ?? activeFallback
  if (!activeTab) return null

  const go = (next: AccountTabId) => {
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

  const tabs = ACCOUNT_TABS.map((tab) => ({
    value: tab.id,
    label: t(tab.labelKey),
  }))

  return (
    <div className={cx('iam-access-list', `iam-access-list--${activeTab}`)}>
      <AdminTabNav
        className='iam-access-list__tabs'
        onValueChange={(tab) => go(tab)}
        tabs={tabs}
        value={activeTab}
      />
    </div>
  )
}
