'use client'

import type { FormEvent, ReactNode } from 'react'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import {
  accountDocumentTitleKey,
  accountHeaderTitle,
  accountRouteLabels,
} from './account-route-meta'
import AccountStepNav from './account-step-nav'
import type { AccountTabVisibility } from './account-tab-visibility'
import AccountDocumentTitle from './components/account-document-title'
import AccountUserAdminTabs from './components/account-user-admin-tabs'
import type { AccountTabId } from './tabs'

type Props = {
  active: AccountTabId
  children: ReactNode
  sidebar: ReactNode
  tabVisibility: AccountTabVisibility
}

function preventSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
}

/**
 * Same shell as `/collections/users/:id` — `doc-header` + `collection-edit` (no `doc-controls`).
 */
export default function AccountPageFrame({ active, children, sidebar, tabVisibility }: Props) {
  const { t } = useIamTranslation()
  const labels = accountRouteLabels(active, t)
  const headerTitle = accountHeaderTitle(active, labels)
  const documentTitle = t(accountDocumentTitleKey(active))

  return (
    <>
      <AccountDocumentTitle title={documentTitle} />
      <AccountStepNav active={active} />
      <div className='gutter gutter--left gutter--right doc-header'>
        <div className='doc-header__header'>
          <h1 className='doc-header__title render-title' title={documentTitle}>
            {headerTitle}
          </h1>
        </div>
        <div className='doc-header__after-header' />
      </div>
      <main className='collection-edit collection-edit--is-editing collection-edit--users iam-account-edit'>
        <form className='collection-edit__form form' noValidate onSubmit={preventSubmit}>
          <div className='collection-edit__main-wrapper'>
            <div className='collection-edit__main'>
              <div className='document-fields document-fields--has-sidebar'>
                <div className='document-fields__main'>
                  <div className='gutter gutter--left gutter--right document-fields__edit'>
                    <div className='render-fields document-fields__fields'>
                      <AccountUserAdminTabs active={active} tabVisibility={tabVisibility}>
                        {children}
                      </AccountUserAdminTabs>
                    </div>
                  </div>
                </div>
                {sidebar}
              </div>
            </div>
          </div>
        </form>
      </main>
    </>
  )
}
