import {
  ACCOUNT_BASE_PATH,
  ACCOUNT_LINKED_PATH,
  ACCOUNT_SECURITY_PATH,
  ACCOUNT_SESSIONS_PATH,
} from '#iam/shared/paths/account-paths'

export type AccountTabId = 'overview' | 'sessions' | 'linked' | 'security'

export const ACCOUNT_TABS: {
  id: AccountTabId
  path: string
  labelKey: `iam:rbac:${string}`
}[] = [
  { id: 'overview', path: ACCOUNT_BASE_PATH, labelKey: 'iam:rbac:accountNav' },
  { id: 'sessions', path: ACCOUNT_SESSIONS_PATH, labelKey: 'iam:rbac:accountTabSessions' },
  { id: 'linked', path: ACCOUNT_LINKED_PATH, labelKey: 'iam:rbac:accountTabLinked' },
  { id: 'security', path: ACCOUNT_SECURITY_PATH, labelKey: 'iam:rbac:accountTabSecurity' },
]

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, '') || '/'
}

function adminBase(adminRoute: string): string {
  return normalizePath(adminRoute || '/')
}

function accountPath(adminRoute: string, relativePath: string): string {
  const base = adminBase(adminRoute)
  const segment = normalizePath(relativePath)
  return base === '/' ? segment : `${base}${segment}`
}

export function accountViewPath(tab: AccountTabId): string {
  const match = ACCOUNT_TABS.find((item) => item.id === tab)
  return match?.path ?? ACCOUNT_BASE_PATH
}

export function accountTabLabelKey(tab: AccountTabId): `iam:rbac:${string}` {
  const match = ACCOUNT_TABS.find((item) => item.id === tab)
  return match?.labelKey ?? 'iam:rbac:accountNav'
}

/** Active tab for `/account` routes. */
export function parseAccountTabFromPath(
  pathname: string | null,
  adminRoute: string
): AccountTabId | null {
  if (!pathname) return null
  const path = normalizePath(pathname)
  for (const tab of ACCOUNT_TABS) {
    const full = accountPath(adminRoute, tab.path)
    if (path === full) return tab.id
  }
  return null
}
