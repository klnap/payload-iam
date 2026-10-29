import type { Field } from 'payload'
import { i18n } from '#iam/shared/i18n/i18n-label'

const TABS_CLASS = 'iam-user-admin-tabs'

export function isUserAdminTabsField(f: Field): boolean {
  return 'type' in f && f.type === 'tabs' && f.admin?.className === TABS_CLASS
}

function isSidebarField(f: Field): boolean {
  if (!('admin' in f) || !f.admin || typeof f.admin !== 'object') return false
  return (f.admin as { position?: string }).position === 'sidebar'
}

export function userIdentityUiField(): Field {
  return {
    name: 'identity',
    type: 'ui',
    admin: {
      disableListColumn: true,
      disableListFilter: true,
      components: {
        Field: '@klnap/payload-iam/client#UserIdentityField',
      },
    },
  } as Field
}

function userAuthInsightsUiField(): Field {
  return {
    name: 'authAccountInsightsUi',
    type: 'ui',
    admin: {
      disableListColumn: true,
      disableListFilter: true,
      components: {
        Field: '@klnap/payload-iam/client#UserAuthInsightsField',
      },
    },
  } as Field
}

function transferRootUiField(): Field {
  return {
    name: 'transferRoot',
    type: 'ui',
    admin: {
      disableListColumn: true,
      disableListFilter: true,
      components: {
        Field: '@klnap/payload-iam/client#TransferRootField',
      },
    },
  } as Field
}

function sendPasswordResetUiField(): Field {
  return {
    name: 'sendPasswordReset',
    type: 'ui',
    admin: {
      disableListColumn: true,
      disableListFilter: true,
      components: {
        Field: '@klnap/payload-iam/client#SendResetPasswordField',
      },
    },
  } as Field
}

/** Native Payload tabs on users edit — Account / Sessions / Security (in-form, not document views). */
export function buildUserAdminTabsField(forgotPassword: boolean, accountTabFields: Field[]): Field {
  const securityTabFields: Field[] = [userAuthInsightsUiField(), transferRootUiField()]
  if (forgotPassword) {
    securityTabFields.push(sendPasswordResetUiField())
  }

  return {
    type: 'tabs',
    admin: {
      className: TABS_CLASS,
    },
    tabs: [
      {
        label: i18n('iam:rbac:accountNav'),
        fields: accountTabFields,
      },
      {
        label: i18n('iam:rbac:accountTabSessions'),
        fields: [
          {
            name: 'userSessions',
            type: 'ui',
            admin: {
              disableListColumn: true,
              disableListFilter: true,
              components: {
                Field: '@klnap/payload-iam/client#UserSessionsField',
              },
            },
          } as Field,
        ],
      },
      {
        label: i18n('iam:rbac:accountTabSecurity'),
        fields: securityTabFields,
      },
    ],
  } as Field
}

/** Stock tabs in main column; identity inside Account tab only. */
export function mergeUserAdminTabsField(fields: Field[], tabsField: Field): Field[] {
  const withoutTabs = fields.filter((f) => !isUserAdminTabsField(f))
  const withoutRootIdentity = withoutTabs.filter((f) => !('name' in f && f.name === 'identity'))
  const withoutTabUi = withoutRootIdentity.filter(
    (f) => !('name' in f && (f.name === 'sendPasswordReset' || f.name === 'authAccountInsightsUi'))
  )

  const sidebar = withoutTabUi.filter(isSidebarField)
  const main = withoutTabUi.filter((f) => !isSidebarField(f))

  // Tabs first in main column — hidden virtual fields must not sit above tab nav (extra gap).
  return [tabsField, ...main, ...sidebar]
}

export function applyUserAdminTabsLayout(fields: Field[], forgotPassword: boolean): Field[] {
  const root: Field[] = []

  for (const f of fields) {
    if (isUserAdminTabsField(f)) continue
    if ('name' in f && f.name === 'identity') continue
    if ('name' in f && f.name === 'sendPasswordReset') continue
    if ('name' in f && f.name === 'authAccountInsightsUi') continue
    root.push(f)
  }

  const tabs = buildUserAdminTabsField(forgotPassword, [userIdentityUiField()])
  return mergeUserAdminTabsField(root, tabs)
}
