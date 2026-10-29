import type { AdminViewServerProps } from 'payload'
import { loadAccountOverviewContext } from '#iam/modules/account'
import {
  AccountAdminTemplate,
  AccountOverviewSidebar,
  AccountPageFrame,
  generateAccountTabMetadata,
  requireAccountUser,
} from '#iam/modules/account/ui'
import SessionsPanel from '#iam/modules/sessions/ui/components/sessions-panel'
import { readIamSurface } from '#iam/plugin/runtime/payload-iam-surface'

function requestHeaders(init?: HeadersInit): Headers {
  if (init instanceof Headers) return init
  return new Headers(init ?? undefined)
}

export const generateMetadata = generateAccountTabMetadata('sessions')

export default async function SessionsView(props: AdminViewServerProps) {
  const user = requireAccountUser(props)
  const { data, languageOptions, tabVisibility } = await loadAccountOverviewContext(props)
  const iam = readIamSurface(props.payload)
  const sessions =
    iam != null
      ? await iam.api.listUserSessions({
          targetUserId: String(user.id),
          headers: requestHeaders(props.initPageResult?.req?.headers),
        })
      : []

  return (
    <AccountAdminTemplate {...props}>
      <AccountPageFrame
        active='sessions'
        sidebar={<AccountOverviewSidebar data={data} languageOptions={languageOptions} />}
        tabVisibility={tabVisibility}
      >
        <div className='field-type'>
          <SessionsPanel compact embedded sessions={sessions} targetUserId={String(user.id)} />
        </div>
      </AccountPageFrame>
    </AccountAdminTemplate>
  )
}
