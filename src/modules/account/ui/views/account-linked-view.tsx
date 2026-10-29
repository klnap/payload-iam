import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import { loadAccountOverviewContext } from '#iam/modules/account/services/load-account-overview-context'
import { AccountAdminTemplate } from '#iam/modules/account/ui/account-admin-template'
import { generateAccountTabMetadata } from '#iam/modules/account/ui/account-generate-metadata'
import AccountPageFrame from '#iam/modules/account/ui/account-page-frame'
import { isAccountTabVisible } from '#iam/modules/account/ui/account-tab-visibility'
import AccountLinkedPanel from '#iam/modules/account/ui/components/account-linked-panel'
import AccountOverviewSidebar from '#iam/modules/account/ui/components/account-overview-sidebar'
import { readPayloadIamCustom } from '#iam/shared/config/payload-iam-custom'
import { ACCOUNT_BASE_PATH } from '#iam/shared/paths/account-paths'

export const generateMetadata = generateAccountTabMetadata('linked')

export default async function AccountLinkedView(props: AdminViewServerProps) {
  const { authInsights, data, languageOptions, tabVisibility } =
    await loadAccountOverviewContext(props)

  if (!isAccountTabVisible('linked', tabVisibility)) {
    const adminRoute = props.initPageResult.req.payload.config.routes?.admin ?? '/admin'
    redirect(
      formatAdminURL({
        adminRoute: adminRoute as `/${string}`,
        path: ACCOUNT_BASE_PATH as `/${string}`,
      })
    )
  }

  const { req } = props.initPageResult
  const login =
    readPayloadIamCustom(req.payload.config.custom as Record<string, unknown> | undefined)?.login ??
    {}
  const emailAndPassword = login.emailAndPassword !== false
  return (
    <AccountAdminTemplate {...props}>
      <AccountPageFrame
        active='linked'
        sidebar={<AccountOverviewSidebar data={data} languageOptions={languageOptions} />}
        tabVisibility={tabVisibility}
      >
        <div className='field-type'>
          <AccountLinkedPanel emailAndPassword={emailAndPassword} insights={authInsights} />
        </div>
      </AccountPageFrame>
    </AccountAdminTemplate>
  )
}
