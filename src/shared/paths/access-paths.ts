/** IAM access hub — relative to `routes.admin`. */
export const ACCESS_BASE_PATH = '/access' as const

export const ACCESS_VIEW_QUERY = 'view' as const

export const IAM_ACCESS_TAB_PREF_KEY = 'iam-access-tab' as const

export const ACCESS_TABS = ['users', 'invitations', 'roles'] as const

export type AccessTab = (typeof ACCESS_TABS)[number]

export function isAccessTab(value: unknown): value is AccessTab {
  return typeof value === 'string' && (ACCESS_TABS as readonly string[]).includes(value)
}

export function accessCollectionListPath(tab: AccessTab): `/collections/${AccessTab}` {
  return `/collections/${tab}`
}

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, '') || '/'
}

function adminBase(adminRoute: string): string {
  return normalizePath(adminRoute || '/')
}

function collectionPath(adminRoute: string, tab: AccessTab): string {
  const base = adminBase(adminRoute)
  const segment = `/collections/${tab}`
  return base === '/' ? segment : `${base}${segment}`
}

/** `/admin/collections/users` (list or document under that collection). */
export function parseAccessTabFromPath(
  pathname: string | null,
  adminRoute: string
): AccessTab | null {
  if (!pathname) return null
  const path = normalizePath(pathname)
  for (const tab of ACCESS_TABS) {
    const list = collectionPath(adminRoute, tab)
    if (path === list || path.startsWith(`${list}/`)) return tab
  }
  return null
}

/** List view only — `/collections/users`, not `/collections/users/:id`. */
export function parseAccessCollectionListTab(
  pathname: string | null,
  adminRoute: string
): AccessTab | null {
  if (!pathname) return null
  const path = normalizePath(pathname)
  for (const tab of ACCESS_TABS) {
    const list = collectionPath(adminRoute, tab)
    if (path === list) return tab
  }
  return null
}

export function parseAccessViewParam(
  searchParams: Record<string, string | string[] | undefined> | null | undefined
): AccessTab | null {
  const raw = searchParams?.[ACCESS_VIEW_QUERY]
  const value = Array.isArray(raw) ? raw[0] : raw
  return isAccessTab(value) ? value : null
}

export function isAccessHubPath(pathname: string | null, adminRoute: string): boolean {
  if (!pathname) return false
  const path = normalizePath(pathname)
  const hub = normalizePath(
    adminRoute === '/' ? ACCESS_BASE_PATH : `${adminRoute}${ACCESS_BASE_PATH}`
  )
  return path === hub
}

/** List query params for Payload — drops the access `view` selector. */
export function listSearchParamsWithoutView(
  searchParams: Record<string, string | string[] | undefined> | null | undefined
): Record<string, string | string[] | undefined> {
  if (!searchParams) return {}
  const { [ACCESS_VIEW_QUERY]: _view, ...rest } = searchParams
  return rest
}
