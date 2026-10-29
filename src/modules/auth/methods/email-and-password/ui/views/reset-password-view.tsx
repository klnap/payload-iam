import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import ResetPasswordForm from '#iam/modules/auth/methods/email-and-password/ui/components/reset-password-form'
import ResetPasswordTokenFromHash from '#iam/modules/auth/methods/email-and-password/ui/components/reset-password-token-from-hash'
import { firstParam } from '#iam/shared/lib/search-params'
import GuestLayout from '#iam/shared/ui/guest/guest-layout'
import GuestLogo from '#iam/shared/ui/guest/guest-logo'
import { guestLogoPropsFromAdminView } from '#iam/shared/ui/guest/guest-logo-props'
import { GuestPage } from '#iam/shared/ui/guest/guest-page'

/**
 * Better Auth reset flow (`/reset-password` or `/reset/:token`) with theme chrome.
 */
export default async function ResetPasswordView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req } = initPageResult
  const { i18n, payload, user } = req
  const {
    admin: {
      routes: { login: loginRoute },
    },
    routes: { admin: adminRoute },
  } = payload.config

  if (user) {
    redirect(adminRoute || '/')
  }

  const routeToken = firstParam(
    (params as { token?: string })?.token ?? (params as { segments?: string[] })?.segments?.[1]
  )
  const queryToken = firstParam(searchParams?.token)

  const labels = {
    password: i18n.t('general:password'),
    confirmPassword: (i18n.t as (key: string) => string)('authentication:confirmPassword'),
    submit: i18n.t('authentication:resetPassword'),
    error: i18n.t('error:tokenNotProvided'),
  }

  const formProps = {
    adminRoute: adminRoute || '/',
    labels,
    loginRoute: loginRoute || '/login',
  }

  const loginHref = formatAdminURL({
    adminRoute: adminRoute as `/${string}`,
    path: loginRoute as `/${string}`,
  })

  return (
    <GuestLayout
      logo={<GuestLogo {...guestLogoPropsFromAdminView(initPageResult, params, searchParams)} />}
    >
      <GuestPage>
        <GuestPage.Header>
          <GuestPage.Title>{i18n.t('authentication:resetPassword')}</GuestPage.Title>
        </GuestPage.Header>
        <GuestPage.Content>
          {routeToken || queryToken ? (
            <ResetPasswordForm token={routeToken ?? queryToken ?? ''} {...formProps} />
          ) : (
            <ResetPasswordTokenFromHash {...formProps} />
          )}
        </GuestPage.Content>
        <GuestPage.Back href={loginHref}>{i18n.t('authentication:backToLogin')}</GuestPage.Back>
      </GuestPage>
    </GuestLayout>
  )
}
