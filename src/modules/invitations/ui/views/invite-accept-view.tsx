import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { type ReactNode, Suspense } from 'react'
import { getRegisteredHost } from '#iam/adapters/payload/host-registry'
import { getLoginViewLabels, resolveLoginCustom } from '#iam/modules/auth/ui'
import { validateInviteAcceptPrelude } from '#iam/modules/invitations/services/accept/invite-accept-prelude'
import InviteAcceptClientGate, {
  InviteAcceptInvalidPanel,
} from '#iam/modules/invitations/ui/components/invite-accept-client-gate'
import InviteAcceptForm from '#iam/modules/invitations/ui/components/invite-accept-form'
import InviteAcceptUrlCleanup from '#iam/modules/invitations/ui/components/invite-accept-url-cleanup'
import { isAdminPanelUser } from '#iam/modules/rbac'
import { getPrivateAuth } from '#iam/plugin/runtime/create-runtime'
import { firstParam } from '#iam/shared/lib/search-params'
import GuestLayout from '#iam/shared/ui/guest/guest-layout'
import GuestLogo from '#iam/shared/ui/guest/guest-logo'
import { guestLogoPropsFromAdminView } from '#iam/shared/ui/guest/guest-logo-props'

/**
 * Public invite accept (admin custom view; path is relative to `routes.admin`).
 * Token in URL is stripped client-side after first paint; POST validates secret.
 */
export default async function InviteAcceptView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req } = initPageResult
  const { payload, user, i18n } = req
  const {
    routes: { admin: adminRoute },
  } = payload.config

  if (isAdminPanelUser(user)) {
    redirect(adminRoute || '/')
  }

  const invitationId = firstParam(searchParams?.id)
  const tokenFromUrl = firstParam(searchParams?.token)

  const loginCustom = resolveLoginCustom(payload)
  const labels = getLoginViewLabels(
    i18n.t.bind(i18n) as import('#iam/modules/auth/ui/hooks/get-login-labels').LoginTranslate
  )
  const serverURL = payload.config.serverURL?.replace(/\/$/, '') ?? ''
  const oauthErrorCallbackURL = serverURL
    ? `${serverURL}${(adminRoute || '/').replace(/\/$/, '')}/login`
    : undefined

  const formProps = {
    adminRoute: adminRoute || '/',
    emailAndPassword: loginCustom.emailAndPassword,
    google: loginCustom.google,
    googleLabel: labels.loginWithGoogle,
    oauthErrorCallbackURL,
    orContinueWithLabel: labels.orContinueWith,
    unauthorizedLabel: labels.unauthorized,
  }

  let content: ReactNode = <InviteAcceptClientGate {...formProps} />

  if (invitationId && tokenFromUrl) {
    try {
      const validated = await validateInviteAcceptPrelude(getRegisteredHost(), getPrivateAuth(), {
        invitationId,
        token: tokenFromUrl,
      })
      if ('ok' in validated && validated.ok) {
        content = (
          <Suspense fallback={null}>
            <InviteAcceptUrlCleanup
              email={validated.prelude.email}
              invitationId={invitationId}
              token={tokenFromUrl}
            />
            <InviteAcceptForm
              {...formProps}
              email={validated.prelude.email}
              invitationId={invitationId}
              token={tokenFromUrl}
            />
          </Suspense>
        )
      } else {
        content = <InviteAcceptInvalidPanel />
      }
    } catch {
      content = <InviteAcceptInvalidPanel />
    }
  }

  return (
    <GuestLayout
      logo={<GuestLogo {...guestLogoPropsFromAdminView(initPageResult, params, searchParams)} />}
    >
      {content}
    </GuestLayout>
  )
}
