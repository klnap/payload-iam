import { formatAdminURL } from 'payload/shared'
import { ACCOUNT_BASE_PATH } from '#iam/shared/paths/account-paths'
import { type AccountTabId, accountTabLabelKey } from './tabs'

export type AccountStepNavItem = {
  label: string
  url?: string
}

type Labels = {
  account: string
  tab: string
}

export function accountRouteLabels(
  active: AccountTabId,
  t: (key: `iam:rbac:${string}`) => string
): Labels {
  const account = t('iam:rbac:accountNav')
  const tab = t(accountTabLabelKey(active))
  return { account, tab }
}

/** Breadcrumb for `SetStepNav` — Account; or Account (link) + tab. */
export function buildAccountStepNav(
  active: AccountTabId,
  labels: Labels,
  adminRoute: string
): AccountStepNavItem[] {
  if (active === 'overview') {
    return [{ label: labels.account }]
  }
  const accountUrl = formatAdminURL({
    adminRoute: adminRoute as `/${string}`,
    path: ACCOUNT_BASE_PATH as `/${string}`,
  })
  return [{ label: labels.account, url: accountUrl }, { label: labels.tab }]
}

/** `doc-header` H1 — tab name, or Account on overview. */
export function accountHeaderTitle(active: AccountTabId, labels: Labels): string {
  return active === 'overview' ? labels.account : labels.tab
}

export function accountDocumentTitleKey(active: AccountTabId): `iam:rbac:${string}` {
  switch (active) {
    case 'sessions':
      return 'iam:rbac:accountRouteTitleSessions'
    case 'linked':
      return 'iam:rbac:accountRouteTitleLinked'
    case 'security':
      return 'iam:rbac:accountRouteTitleSecurity'
    default:
      return 'iam:rbac:accountNav'
  }
}
