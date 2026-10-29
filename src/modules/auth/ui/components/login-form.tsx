'use client'

import { Button } from '@base-ui/react/button'
import { formatAdminURL } from 'payload/shared'
import { cx } from 'tailwind-variants'
import LoginEmailOtpStep from '#iam/modules/auth/methods/email-and-password/ui/components/login-email-otp-step'
import GoogleLoginButton from '#iam/modules/auth/methods/google/ui/google-login-button'
import LoginOAuthDivider from '#iam/modules/auth/methods/google/ui/login-oauth-divider'
import type { LoginViewLabels } from '#iam/modules/auth/ui/hooks/get-login-labels'
import { useLoginForm } from '#iam/modules/auth/ui/hooks/use-login-form'
import {
  guestForm,
  guestFormInputWrap,
  guestInlineLinkMuted,
} from '#iam/shared/ui/guest/guest-payload-form'

type Props = {
  emailAndPassword: boolean
  loginOtp: boolean
  codeLength: number
  google: boolean
  redirectTo: string
  adminRoute: string
  oauthErrorCallbackURL?: string
  forgotRoute?: string
  labels: LoginViewLabels
  pendingLoginOtp?: boolean
  /** Email for pending OTP challenge (SSR from cookies / verification store). */
  pendingOtpEmail?: string
  /** From email magic link (`?otp=`). Prefills and verifies when challenge cookie is active. */
  prefillOtpCode?: string
}

/**
 * Native form (not @payloadcms/ui Form).
 * Workspace packages often resolve a second @payloadcms/ui copy — Form's
 * useServerFunctions then misses RootProvider context. Same CSS classes → stock look.
 */
export default function LoginForm({
  emailAndPassword,
  loginOtp,
  codeLength,
  google,
  redirectTo,
  adminRoute,
  oauthErrorCallbackURL,
  forgotRoute,
  labels,
  pendingLoginOtp,
  pendingOtpEmail,
  prefillOtpCode,
}: Props) {
  const { pending, setPending, otpStepActive, otpEmail, clearOtpEmail, onSubmit } = useLoginForm({
    loginOtp,
    redirectTo,
    unauthorizedMessage: labels.unauthorized,
    pendingLoginOtp,
    pendingOtpEmail,
    prefillOtpCode,
  })

  const forgotHref = forgotRoute
    ? formatAdminURL({
        adminRoute: adminRoute as `/${string}`,
        path: forgotRoute as `/${string}`,
      })
    : undefined

  if (otpStepActive) {
    return (
      <LoginEmailOtpStep
        disabled={pending}
        email={otpEmail}
        labels={{
          title: labels.otpTitle,
          description: labels.otpDescription,
          codeAriaLabel: labels.otpCode,
          verify: labels.otpVerify,
          invalid: labels.otpInvalid,
          sendFailed: labels.otpSendFailed,
          back: labels.otpBack,
        }}
        onBack={clearOtpEmail}
        onPendingChange={setPending}
        codeLength={codeLength}
        redirectTo={redirectTo}
        prefillOtpCode={prefillOtpCode}
      />
    )
  }

  if (google && !emailAndPassword) {
    return (
      <div className={cx(guestForm)}>
        <GoogleLoginButton
          callbackURL={redirectTo}
          disabled={pending}
          errorCallbackURL={oauthErrorCallbackURL}
          errorMessage={labels.unauthorized}
          label={labels.loginWithGoogle}
          onPendingChange={setPending}
        />
      </div>
    )
  }

  if (!emailAndPassword) return null

  return (
    <form className={cx(guestForm)} onSubmit={(e) => void onSubmit(e)}>
      {google ? (
        <>
          <GoogleLoginButton
            callbackURL={redirectTo}
            disabled={pending}
            errorCallbackURL={oauthErrorCallbackURL}
            errorMessage={labels.unauthorized}
            label={labels.loginWithGoogle}
            onPendingChange={setPending}
          />
          <LoginOAuthDivider label={labels.orContinueWith} />
        </>
      ) : null}
      <div className={cx(guestFormInputWrap)}>
        <div className='field-type email'>
          <label className='field-label' htmlFor='field-email'>
            {labels.email}
          </label>
          <div className='field-type__wrap'>
            <input autoComplete='email' id='field-email' name='email' required type='email' />
          </div>
        </div>
        <div className='field-type password'>
          <div className='mb-[var(--spacing-field-label-bottom,0.25rem)] flex items-baseline justify-between gap-6'>
            <label className='field-label m-0' htmlFor='field-password'>
              {labels.password}
            </label>
            {forgotHref ? (
              <a className={cx(guestInlineLinkMuted, 'm-0 ms-2 shrink-0')} href={forgotHref}>
                {labels.forgotPassword}
              </a>
            ) : null}
          </div>
          <div className='field-type__wrap'>
            <input
              autoComplete='current-password'
              id='field-password'
              name='password'
              required
              type='password'
            />
          </div>
        </div>
      </div>
      <div className={cx('form-submit', 'mt-8')}>
        <Button className='btn btn--style-primary btn--size-large' disabled={pending} type='submit'>
          {labels.login}
        </Button>
      </div>
    </form>
  )
}
