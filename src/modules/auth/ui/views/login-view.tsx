import { RenderServerComponent } from '@payloadcms/ui/elements/RenderServerComponent'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { getSafeRedirect } from 'payload/shared'
import { resolveLoginAuthError } from '#iam/adapters/better-auth/auth-login-errors'
import { requestHasPendingLoginOtpCookie } from '#iam/adapters/better-auth/cookie-names'
import { resolvePendingLoginOtpEmailForLoginView } from '#iam/adapters/better-auth/resolve-pending-login-otp-email'
import LoginAuthErrorToast from '#iam/modules/auth/ui/components/login-auth-error-toast'
import LoginBootstrapSection from '#iam/modules/auth/ui/components/login-bootstrap-section'
import LoginForm from '#iam/modules/auth/ui/components/login-form'
import { getLoginViewLabels } from '#iam/modules/auth/ui/hooks/get-login-labels'
import { resolveLoginCustom } from '#iam/modules/auth/ui/hooks/login-custom'
import { hasRoot } from '#iam/modules/bootstrap'
import { isAdminPanelUser } from '#iam/modules/rbac'
import { getRegisteredIam } from '#iam/plugin/runtime/create-runtime'
import { readIamSurface } from '#iam/plugin/runtime/payload-iam-surface'
import GuestLayout from '#iam/shared/ui/guest/guest-layout'
import GuestLogo from '#iam/shared/ui/guest/guest-logo'
import { guestLogoPropsFromAdminView } from '#iam/shared/ui/guest/guest-logo-props'
import { GuestPage } from '#iam/shared/ui/guest/guest-page'

/** Mirrors Payload stock LoginView; form posts to Better Auth. */
export default async function LoginView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { locale, permissions, req } = initPageResult
  const { i18n, payload, user } = req
  const {
    admin: { components: { afterLogin, beforeLogin } = {} },
    routes: { admin: adminRoute },
  } = payload.config

  const fallback = adminRoute || '/'
  const rawRedirect = searchParams?.redirect
  const redirectParam = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect
  const redirectTo = getSafeRedirect({
    fallbackTo: fallback,
    redirectTo: typeof redirectParam === 'string' ? redirectParam : fallback,
  })

  const rawBaError = searchParams?.error
  const baError = Array.isArray(rawBaError) ? rawBaError[0] : rawBaError
  const rawAuthError = searchParams?.authError
  const queryAuthError = Array.isArray(rawAuthError) ? rawAuthError[0] : rawAuthError
  const authError = resolveLoginAuthError({
    betterAuthError: typeof baError === 'string' ? baError : null,
    queryAuthError: typeof queryAuthError === 'string' ? queryAuthError : null,
  })

  const serverURL = payload.config.serverURL?.replace(/\/$/, '') ?? ''
  const oauthErrorCallbackURL = serverURL
    ? `${serverURL}${(adminRoute || '/').replace(/\/$/, '')}/login`
    : undefined

  const pendingLoginOtp = requestHasPendingLoginOtpCookie(req.headers.get('cookie'))

  if (isAdminPanelUser(user) && !pendingLoginOtp) {
    redirect(redirectTo)
  }

  const needsBootstrap = !(await hasRoot(payload))
  const loginCustom = resolveLoginCustom(payload)

  const requestOrigin =
    serverURL ||
    (() => {
      const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
      if (!host) return 'http://localhost'
      const proto = req.headers.get('x-forwarded-proto') ?? 'http'
      return `${proto}://${host}`
    })()

  const pendingOtpEmail =
    pendingLoginOtp && loginCustom.loginOtp
      ? await resolvePendingLoginOtpEmailForLoginView(
          (readIamSurface(payload) ?? getRegisteredIam()).handler,
          requestOrigin,
          req.headers.get('cookie')
        )
      : null

  const rawOtpQuery = searchParams?.otp ?? searchParams?.code
  const otpQueryValue = Array.isArray(rawOtpQuery) ? rawOtpQuery[0] : rawOtpQuery
  const prefillOtpCode =
    typeof otpQueryValue === 'string' && /^\d+$/.test(otpQueryValue) ? otpQueryValue : undefined

  const labels = getLoginViewLabels(
    i18n.t.bind(i18n) as import('#iam/modules/auth/ui/hooks/get-login-labels').LoginTranslate
  )

  const serverProps = {
    i18n,
    locale,
    params,
    payload,
    permissions,
    searchParams,
    user,
  }

  const logo = <GuestLogo {...guestLogoPropsFromAdminView(initPageResult, params, searchParams)} />

  return (
    <GuestLayout logo={logo}>
      {RenderServerComponent({
        Component: beforeLogin,
        importMap: payload.importMap,
        serverProps,
      })}
      {needsBootstrap ? (
        <LoginBootstrapSection adminRoute={adminRoute || '/'} labels={labels} />
      ) : (
        <GuestPage>
          <GuestPage.Content>
            <LoginAuthErrorToast authError={authError} message={labels.accessDenied} />
            <LoginForm
              adminRoute={adminRoute || '/'}
              emailAndPassword={loginCustom.emailAndPassword}
              forgotRoute={loginCustom.forgotRoute}
              google={loginCustom.google}
              labels={labels}
              loginOtp={loginCustom.loginOtp}
              codeLength={loginCustom.length}
              oauthErrorCallbackURL={oauthErrorCallbackURL}
              pendingLoginOtp={pendingLoginOtp && loginCustom.loginOtp}
              pendingOtpEmail={pendingOtpEmail ?? undefined}
              prefillOtpCode={prefillOtpCode}
              redirectTo={redirectTo}
            />
          </GuestPage.Content>
        </GuestPage>
      )}
      {RenderServerComponent({
        Component: afterLogin,
        importMap: payload.importMap,
        serverProps,
      })}
    </GuestLayout>
  )
}
