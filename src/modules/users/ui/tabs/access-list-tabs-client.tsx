'use client'

import { useAuth, useConfig, usePreferences } from '@payloadcms/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { startTransition, useEffect } from 'react'
import { cx } from 'tailwind-variants'
import { InviteDrawer, type InviteRoleOption } from '#iam/modules/invitations/ui/index'
import {
  type AccessTab,
  accessCollectionListPath,
  IAM_ACCESS_TAB_PREF_KEY,
  isAccessTab,
  parseAccessCollectionListTab,
} from '#iam/shared/paths/access-paths'
import { AdminTabNav } from '#iam/shared/ui/admin/admin-tab-nav'

type Props = {
  roleOptions: InviteRoleOption[]
  usersListLabel: string
  invitationsListLabel: string
  rolesListLabel: string
  invitationsEnabled: boolean
}

function readableAccessTabs(
  permissions: { collections?: Record<string, { read?: boolean }> } | null | undefined,
  invitationsEnabled: boolean
): AccessTab[] {
  const order: AccessTab[] = ['users', 'invitations', 'roles']
  return order.filter((tab) => {
    if (tab === 'invitations' && !invitationsEnabled) return false
    return permissions?.collections?.[tab]?.read === true
  })
}

/** Users · Invitations · Roles on `/collections/{tab}` list views. */
export default function AccessListTabsClient({
  roleOptions,
  usersListLabel,
  invitationsListLabel,
  rolesListLabel,
  invitationsEnabled,
}: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { config } = useConfig()
  const { permissions } = useAuth()
  const { setPreference } = usePreferences()
  const adminRoute = config?.routes?.admin ?? '/admin'

  const activeTab = parseAccessCollectionListTab(pathname, adminRoute)
  const readableTabs = readableAccessTabs(permissions, invitationsEnabled)

  useEffect(() => {
    if (!activeTab || !readableTabs.includes(activeTab)) return
    void setPreference(IAM_ACCESS_TAB_PREF_KEY, activeTab)
  }, [activeTab, readableTabs, setPreference])

  useEffect(() => {
    if (!activeTab || readableTabs.length === 0) return
    if (readableTabs.includes(activeTab)) return
    const next = readableTabs[0]
    if (!next) return
    const qs = searchParams.toString()
    const path = accessCollectionListPath(next)
    router.replace(
      formatAdminURL({
        adminRoute,
        path: qs ? `${path}?${qs}` : path,
      })
    )
  }, [activeTab, adminRoute, readableTabs, router, searchParams])

  if (!activeTab) return null
  if (readableTabs.length === 0) return null

  const go = (next: AccessTab) => {
    if (!isAccessTab(next)) return
    void setPreference(IAM_ACCESS_TAB_PREF_KEY, next)
    const qs = searchParams.toString()
    const path = accessCollectionListPath(next)
    startTransition(() => {
      router.push(
        formatAdminURL({
          adminRoute,
          path: qs ? `${path}?${qs}` : path,
        })
      )
    })
  }

  const labelByTab: Record<AccessTab, string> = {
    users: usersListLabel,
    invitations: invitationsListLabel,
    roles: rolesListLabel,
  }
  const tabs = readableTabs.map((value) => ({ value, label: labelByTab[value] }))

  return (
    <div className={cx('iam-access-list', `iam-access-list--${activeTab}`)}>
      {activeTab === 'invitations' ? (
        <div className='list-header__title-actions iam-access-list__invite-slot'>
          <InviteDrawer roleOptions={roleOptions} />
        </div>
      ) : null}
      <AdminTabNav
        className='iam-access-list__tabs'
        onValueChange={(tab) => go(tab)}
        tabs={tabs}
        value={activeTab}
      />
    </div>
  )
}
