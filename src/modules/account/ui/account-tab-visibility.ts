import { ACCOUNT_TABS, type AccountTabId } from './tabs'

export type AccountTabVisibility = {
  linked: boolean
  security: boolean
}

export function resolveAccountTabVisibility(args: {
  emailAndPassword: boolean
  google: boolean
  hasPassword: boolean
}): AccountTabVisibility {
  return {
    linked: args.google || args.emailAndPassword,
    security: args.emailAndPassword && args.hasPassword,
  }
}

export function visibleAccountTabs(visibility: AccountTabVisibility) {
  return ACCOUNT_TABS.filter((tab) => {
    if (tab.id === 'linked') return visibility.linked
    if (tab.id === 'security') return visibility.security
    return true
  })
}

export function isAccountTabVisible(tab: AccountTabId, visibility: AccountTabVisibility): boolean {
  return visibleAccountTabs(visibility).some((item) => item.id === tab)
}

export function accountTabPath(tab: AccountTabId): string {
  const match = ACCOUNT_TABS.find((item) => item.id === tab)
  return match?.path ?? '/account'
}
