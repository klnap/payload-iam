import { describe, expect, test } from 'bun:test'
import type { Field } from 'payload'
import {
  applyUserAdminTabsLayout,
  buildUserAdminTabsField,
  isUserAdminTabsField,
  mergeUserAdminTabsField,
  userIdentityUiField,
} from '../../../../src/modules/users/fields/user-admin-tabs'
import { resolvePayloadLabel } from '../../../../src/shared/i18n/i18n-label'

const mockT = (key: string) => key.replace(/^iam:rbac:/, '')
const labelArgs = {
  i18n: { language: 'en', fallbackLanguage: 'en', t: mockT },
  t: mockT,
}

function tabLabel(tab: { label?: unknown } | undefined): string {
  return resolvePayloadLabel(tab?.label, labelArgs)
}

describe('user admin tabs field', () => {
  test('Account tab has identity only; roles stay in root for sidebar', () => {
    const fields = applyUserAdminTabsLayout(
      [
        {
          name: 'roles',
          type: 'relationship',
          relationTo: 'roles',
          admin: { position: 'sidebar' },
        },
        { name: 'isActive', type: 'checkbox', admin: { position: 'sidebar' } },
      ],
      true
    )
    const tabs = fields.find(isUserAdminTabsField)
    const account = tabs?.tabs?.[0]
    const names = account?.fields?.map((f) => ('name' in f ? f.name : f.type)) ?? []
    expect(tabLabel(account)).toBe('accountNav')
    expect(names).toEqual(['identity'])
    expect(fields.some((f) => 'name' in f && f.name === 'roles')).toBe(true)
    const security = tabs?.tabs?.[2]
    expect(security?.fields?.some((f) => 'name' in f && f.name === 'authAccountInsightsUi')).toBe(
      true
    )
    expect(fields.some((f) => 'name' in f && f.name === 'authAccountInsightsUi')).toBe(false)
  })

  test('buildUserAdminTabsField always includes Security with sign-in methods', () => {
    const tabs = buildUserAdminTabsField(true, [userIdentityUiField()])
    expect(isUserAdminTabsField(tabs)).toBe(true)
    const labels = tabs.tabs?.map((t) => tabLabel(t)) ?? []
    expect(labels).toEqual(['accountNav', 'accountTabSessions', 'accountTabSecurity'])
    const security = tabs.tabs?.[2]
    expect(security?.fields?.some((f) => 'name' in f && f.name === 'authAccountInsightsUi')).toBe(
      true
    )
    expect(security?.fields?.some((f) => 'name' in f && f.name === 'sendPasswordReset')).toBe(true)
  })

  test('buildUserAdminTabsField omits send reset when forgot password disabled', () => {
    const tabs = buildUserAdminTabsField(false, [userIdentityUiField()])
    const labels = tabs.tabs?.map((t) => tabLabel(t)) ?? []
    expect(labels).toEqual(['accountNav', 'accountTabSessions', 'accountTabSecurity'])
    const security = tabs.tabs?.[2]
    expect(security?.fields?.some((f) => 'name' in f && f.name === 'authAccountInsightsUi')).toBe(
      true
    )
    expect(security?.fields?.some((f) => 'name' in f && f.name === 'sendPasswordReset')).toBe(false)
  })

  test('mergeUserAdminTabsField drops root identity and places tabs first in main column', () => {
    const hidden: Field = { name: 'avatar', type: 'text', admin: { hidden: true } }
    const tabs = buildUserAdminTabsField(true, [userIdentityUiField()])
    const next = mergeUserAdminTabsField([hidden, userIdentityUiField()], tabs)
    expect(next.some((f) => 'name' in f && f.name === 'identity')).toBe(false)
    expect(next[0]?.type).toBe('tabs')
    const account = next[0]?.tabs?.[0]
    expect(account?.fields?.some((f) => 'name' in f && f.name === 'identity')).toBe(true)
  })

  test('mergeUserAdminTabsField removes duplicate tabs and sidebar sendPasswordReset', () => {
    const oldTabs = buildUserAdminTabsField(false, [userIdentityUiField()])
    const reset: Field = { name: 'sendPasswordReset', type: 'ui' }
    const next = mergeUserAdminTabsField(
      [oldTabs, reset],
      buildUserAdminTabsField(true, [userIdentityUiField()])
    )
    const names = next.flatMap((f) => ('name' in f ? [f.name] : []))
    expect(names).not.toContain('sendPasswordReset')
    expect(next.filter(isUserAdminTabsField).length).toBe(1)
  })
})
