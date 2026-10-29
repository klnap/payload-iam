import { redirect } from 'next/navigation'
import type { AdminViewServerProps, Payload } from 'payload'
import { formatAdminURL } from 'payload/shared'
import { loadAccountOverviewContext } from '#iam/modules/account/services/load-account-overview-context'
import { AccountAdminTemplate } from '#iam/modules/account/ui/account-admin-template'
import { generateAccountTabMetadata } from '#iam/modules/account/ui/account-generate-metadata'
import AccountPageFrame from '#iam/modules/account/ui/account-page-frame'
import { isAccountTabVisible } from '#iam/modules/account/ui/account-tab-visibility'
import AccountOverviewSidebar from '#iam/modules/account/ui/components/account-overview-sidebar'
import AccountSecurityPanel from '#iam/modules/account/ui/components/account-security-panel'
import { readPayloadIamCustom } from '#iam/shared/config/payload-iam-custom'
import { ACCOUNT_BASE_PATH } from '#iam/shared/paths/account-paths'

function getLoginFlags(payload: Payload) {
  return (
    readPayloadIamCustom(payload.config.custom as Record<string, unknown> | undefined)?.login ?? {}
  )
}

export const generateMetadata = generateAccountTabMetadata('security')

export default async function AccountSecurityView(props: AdminViewServerProps) {
  const { data, languageOptions, tabVisibility } = await loadAccountOverviewContext(props)

  if (!isAccountTabVisible('security', tabVisibility)) {
    const adminRoute = props.initPageResult.req.payload.config.routes?.admin ?? '/admin'
    redirect(
      formatAdminURL({
        adminRoute: adminRoute as `/${string}`,
        path: ACCOUNT_BASE_PATH as `/${string}`,
      })
    )
  }

  const { req } = props.initPageResult
  const loginFlags = getLoginFlags(req.payload)
  return (
    <AccountAdminTemplate {...props}>
      <AccountPageFrame
        active='security'
        sidebar={<AccountOverviewSidebar data={data} languageOptions={languageOptions} />}
        tabVisibility={tabVisibility}
      >
        <div className='field-type'>
          <AccountSecurityPanel
            email={data.email}
            forgotPasswordEnabled={Boolean(loginFlags.forgotPassword)}
          />
        </div>
      </AccountPageFrame>
    </AccountAdminTemplate>
  )
}
