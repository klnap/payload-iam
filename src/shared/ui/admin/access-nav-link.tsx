'use client'

import { Link, useAuth, useConfig, usePreferences } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import {
  type AccessTab,
  accessCollectionListPath,
  IAM_ACCESS_TAB_PREF_KEY,
  isAccessTab,
  parseAccessTabFromPath,
} from '#iam/shared/paths/access-paths'

function accessTabsForUser(
  permissions: { collections?: Record<string, { read?: boolean }> } | null | undefined,
  invitationsEnabled: boolean
): AccessTab[] {
  const tabs: AccessTab[] = ['users', 'roles']
  if (invitationsEnabled) tabs.splice(1, 0, 'invitations')
  return tabs.filter((tab) => permissions?.collections?.[tab]?.read)
}

export default function AccessNavLink() {
  const pathname = usePathname()
  const { permissions } = useAuth()
  const { t } = useIamTranslation()
  const { config } = useConfig()
  const { getPreference } = usePreferences()
  const adminRoute = config?.routes?.admin ?? '/admin'
  const invitationsEnabled = config?.collections?.some((c) => c.slug === 'invitations') ?? false

  const readableTabs = useMemo(
    () => accessTabsForUser(permissions, invitationsEnabled),
    [invitationsEnabled, permissions]
  )

  const defaultTab = readableTabs[0] ?? 'users'
  const [href, setHref] = useState(() =>
    formatAdminURL({
      adminRoute,
      path: accessCollectionListPath(defaultTab),
    })
  )

  useEffect(() => {
    if (readableTabs.length === 0) return
    void getPreference(IAM_ACCESS_TAB_PREF_KEY).then((pref) => {
      const tab = isAccessTab(pref) && readableTabs.includes(pref) ? pref : defaultTab
      setHref(
        formatAdminURL({
          adminRoute,
          path: accessCollectionListPath(tab),
        })
      )
    })
  }, [adminRoute, defaultTab, getPreference, readableTabs])

  if (readableTabs.length === 0) return null

  const currentView = parseAccessTabFromPath(pathname, adminRoute)
  const isActive = currentView !== null && readableTabs.includes(currentView)

  const Label = (
    <Fragment>
      {isActive ? <div className='nav__link-indicator' /> : null}
      <span className='nav__link-label'>{t('iam:rbac:accessNav')}</span>
    </Fragment>
  )

  if (isActive) {
    return (
      <div className='nav__link' id='nav-access'>
        {Label}
      </div>
    )
  }

  return (
    <Link className='nav__link' href={href} id='nav-access' prefetch={false}>
      {Label}
    </Link>
  )
}
