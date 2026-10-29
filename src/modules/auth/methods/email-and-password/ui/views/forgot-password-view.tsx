import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import ForgotPasswordForm from '#iam/modules/auth/methods/email-and-password/ui/components/forgot-password-form'
import { readPayloadIamCustom } from '#iam/shared/config/payload-iam-custom'
import { tIam } from '#iam/shared/i18n/t-iam'
import GuestLayout from '#iam/shared/ui/guest/guest-layout'
import GuestLogo from '#iam/shared/ui/guest/guest-logo'
import { guestLogoPropsFromAdminView } from '#iam/shared/ui/guest/guest-logo-props'
import { GuestPage } from '#iam/shared/ui/guest/guest-page'

export default async function ForgotPasswordView({
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

  const loginCustom = readPayloadIamCustom(
    payload.config.custom as Record<string, unknown> | undefined
  )?.login
  const forgotEnabled =
    loginCustom?.forgotPassword !== false && loginCustom?.emailAndPassword !== false

  if (!forgotEnabled) {
    redirect(
      formatAdminURL({
        adminRoute: adminRoute as `/${string}`,
        path: (loginRoute ?? '/login') as `/${string}`,
      })
    )
  }

  if (user) {
    redirect(adminRoute || '/')
  }

  const loginHref = formatAdminURL({
    adminRoute: adminRoute as `/${string}`,
    path: (loginRoute ?? '/login') as `/${string}`,
  })

  const labels = {
    title: i18n.t('authentication:forgotPassword'),
    instructions: tIam(i18n.t, 'iam:rbac:forgotPasswordInstructions'),
    backToLogin: i18n.t('authentication:backToLogin'),
    email: i18n.t('general:email'),
    submit: tIam(i18n.t, 'iam:rbac:forgotPasswordSubmit'),
    submitting: tIam(i18n.t, 'iam:rbac:forgotPasswordSubmitting'),
    success: tIam(i18n.t, 'iam:rbac:forgotPasswordSuccessAmbiguous'),
    error: tIam(i18n.t, 'iam:rbac:forgotPasswordRequestFailed'),
  }

  return (
    <GuestLayout
      logo={<GuestLogo {...guestLogoPropsFromAdminView(initPageResult, params, searchParams)} />}
    >
      <GuestPage>
        <GuestPage.Header>
          <GuestPage.Title>{labels.title}</GuestPage.Title>
          <GuestPage.Description>{labels.instructions}</GuestPage.Description>
        </GuestPage.Header>
        <GuestPage.Content>
          <ForgotPasswordForm
            labels={{
              email: labels.email,
              submit: labels.submit,
              submitting: labels.submitting,
              success: labels.success,
              error: labels.error,
            }}
          />
        </GuestPage.Content>
        <GuestPage.Back href={loginHref}>{labels.backToLogin}</GuestPage.Back>
      </GuestPage>
    </GuestLayout>
  )
}
