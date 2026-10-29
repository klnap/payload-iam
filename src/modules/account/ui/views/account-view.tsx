import type { AdminViewServerProps } from 'payload'
import { loadAccountOverviewContext } from '#iam/modules/account/services/load-account-overview-context'
import { AccountAdminTemplate } from '#iam/modules/account/ui/account-admin-template'
import { generateAccountTabMetadata } from '#iam/modules/account/ui/account-generate-metadata'
import AccountPageFrame from '#iam/modules/account/ui/account-page-frame'
import AccountOverviewPanel from '#iam/modules/account/ui/components/account-overview-panel'
import AccountOverviewSidebar from '#iam/modules/account/ui/components/account-overview-sidebar'

export const generateMetadata = generateAccountTabMetadata('overview')

export default async function AccountView(props: AdminViewServerProps) {
  const { data, languageOptions, tabVisibility } = await loadAccountOverviewContext(props)
  return (
    <AccountAdminTemplate {...props}>
      <AccountPageFrame
        active='overview'
        sidebar={<AccountOverviewSidebar data={data} languageOptions={languageOptions} />}
        tabVisibility={tabVisibility}
      >
        <div className='field-type'>
          <AccountOverviewPanel data={data} />
        </div>
      </AccountPageFrame>
    </AccountAdminTemplate>
  )
}
