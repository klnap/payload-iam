import { describe, expect, test } from 'bun:test'
import {
  accountDocumentTitleKey,
  buildAccountStepNav,
} from '../../../../src/modules/account/ui/account-route-meta'
import {
  resolveAccountTabVisibility,
  visibleAccountTabs,
} from '../../../../src/modules/account/ui/account-tab-visibility'
import { accountViewPath, parseAccountTabFromPath } from '../../../../src/modules/account/ui/tabs'

describe('account-tabs paths', () => {
  test('parseAccountTabFromPath', () => {
    expect(parseAccountTabFromPath('/account', '/')).toBe('overview')
    expect(parseAccountTabFromPath('/account/sessions', '/')).toBe('sessions')
    expect(parseAccountTabFromPath('/account/linked', '/')).toBe('linked')
    expect(parseAccountTabFromPath('/account/security', '/')).toBe('security')
    expect(parseAccountTabFromPath('/admin/account/sessions', '/admin')).toBe('sessions')
    expect(parseAccountTabFromPath('/collections/users', '/')).toBe(null)
  })

  test('accountViewPath', () => {
    expect(accountViewPath('overview')).toBe('/account')
    expect(accountViewPath('linked')).toBe('/account/linked')
    expect(accountViewPath('security')).toBe('/account/security')
  })

  test('account route titles and step nav', () => {
    const labels = { account: 'Account', tab: 'Sessions' }
    expect(accountDocumentTitleKey('overview')).toBe('iam:rbac:accountNav')
    expect(accountDocumentTitleKey('sessions')).toBe('iam:rbac:accountRouteTitleSessions')
    expect(buildAccountStepNav('overview', labels, '/')).toEqual([{ label: 'Account' }])
    expect(buildAccountStepNav('sessions', labels, '/')).toEqual([
      { label: 'Account', url: '/account' },
      { label: 'Sessions' },
    ])
  })

  test('resolveAccountTabVisibility', () => {
    expect(
      resolveAccountTabVisibility({
        emailAndPassword: true,
        google: true,
        hasPassword: true,
      })
    ).toEqual({ linked: true, security: true })

    expect(
      resolveAccountTabVisibility({
        emailAndPassword: true,
        google: true,
        hasPassword: false,
      })
    ).toEqual({ linked: true, security: false })

    expect(
      resolveAccountTabVisibility({
        emailAndPassword: true,
        google: false,
        hasPassword: false,
      })
    ).toEqual({ linked: true, security: false })

    expect(visibleAccountTabs({ linked: false, security: false }).map((t) => t.id)).toEqual([
      'overview',
      'sessions',
    ])
  })
})
