'use client'

import { Button } from '@base-ui/react/button'
import { toast } from '@payloadcms/ui'
import { type SubmitEvent, useCallback, useEffect, useRef, useState } from 'react'
import { cx } from 'tailwind-variants'
import {
  sendLoginOtp,
  verifyLoginOtp,
} from '#iam/modules/auth/methods/email-and-password/ui/login-otp-api'
import {
  clearLoginOtpEmailStorage,
  persistLoginOtpEmail,
  readLoginOtpEmail,
} from '#iam/modules/auth/ui/hooks/login-otp-email-storage'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { iamAuthApiUrl } from '#iam/shared/paths/auth-api-path'
import { IAM_AUTH_ROUTES } from '#iam/shared/paths/auth-routes'
import { GuestPage } from '#iam/shared/ui/guest/guest-page'
import { guestForm } from '#iam/shared/ui/guest/guest-payload-form'
import OtpCodeField from './otp-code-field'

const RESEND_COOLDOWN_SEC = 30

type Props = {
  email: string
  redirectTo: string
  codeLength: number
  disabled?: boolean
  prefillOtpCode?: string
  labels: {
    title: string
    description: string
    codeAriaLabel: string
    verify: string
    invalid: string
    sendFailed: string
    back: string
  }
  onBack: () => void
  onPendingChange?: (pending: boolean) => void
}

export default function LoginEmailOtpStep({
  email,
  redirectTo,
  codeLength,
  disabled,
  prefillOtpCode,
  labels,
  onBack,
  onPendingChange,
}: Props) {
  const { t } = useIamTranslation()
  const [code, setCode] = useState(() =>
    prefillOtpCode && prefillOtpCode.length === codeLength ? prefillOtpCode : ''
  )
  const autoVerifyAttempted = useRef(false)
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SEC)
  const [displayEmail, setDisplayEmail] = useState(() => email.trim() || readLoginOtpEmail() || '')

  useEffect(() => {
    const fromProps = email.trim()
    if (fromProps) {
      setDisplayEmail(fromProps)
      return
    }
    const stored = readLoginOtpEmail()
    if (stored) setDisplayEmail(stored)
  }, [email])

  useEffect(() => {
    if (displayEmail.trim()) return
    const stored = readLoginOtpEmail()
    if (stored) {
      setDisplayEmail(stored)
      return
    }

    let cancelled = false
    void fetch(iamAuthApiUrl(IAM_AUTH_ROUTES.emailAndPassword.loginOtp.pendingEmail), {
      credentials: 'include',
    })
      .then(async (res) => (res.ok ? (res.json() as Promise<{ email?: string }>) : null))
      .then((data) => {
        if (cancelled || !data?.email?.trim()) return
        const resolved = data.email.trim()
        persistLoginOtpEmail(resolved)
        setDisplayEmail(resolved)
      })
      .catch(() => {
        // ignore — user can still enter OTP
      })

    return () => {
      cancelled = true
    }
  }, [displayEmail])

  useEffect(() => {
    if (!prefillOtpCode || prefillOtpCode.length !== codeLength) return
    setCode(prefillOtpCode)
    const url = new URL(window.location.href)
    url.searchParams.delete('otp')
    url.searchParams.delete('code')
    const next = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState({}, '', next)
  }, [codeLength, prefillOtpCode])

  useEffect(() => {
    if (autoVerifyAttempted.current) return
    if (!prefillOtpCode || prefillOtpCode.length !== codeLength || disabled) return
    autoVerifyAttempted.current = true
    onPendingChange?.(true)
    void verifyLoginOtp(prefillOtpCode)
      .then((ok) => {
        if (!ok) {
          toast.error(labels.invalid)
          return
        }
        clearLoginOtpEmailStorage()
        window.location.assign(redirectTo)
      })
      .catch(() => {
        toast.error(labels.invalid)
      })
      .finally(() => {
        onPendingChange?.(false)
      })
  }, [codeLength, disabled, labels.invalid, onPendingChange, prefillOtpCode, redirectTo])

  const sendOtp = useCallback(async () => {
    onPendingChange?.(true)
    try {
      const ok = await sendLoginOtp()
      if (!ok) {
        toast.error(labels.sendFailed)
        return false
      }
      setResendIn(RESEND_COOLDOWN_SEC)
      return true
    } catch {
      toast.error(labels.sendFailed)
      return false
    } finally {
      onPendingChange?.(false)
    }
  }, [labels.sendFailed, onPendingChange])

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const onSubmit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (disabled || code.trim().length < codeLength) return
      onPendingChange?.(true)
      try {
        const ok = await verifyLoginOtp(code.trim())
        if (!ok) {
          toast.error(labels.invalid)
          return
        }
        clearLoginOtpEmailStorage()
        window.location.assign(redirectTo)
      } catch {
        toast.error(labels.invalid)
      } finally {
        onPendingChange?.(false)
      }
    },
    [code, codeLength, disabled, labels.invalid, onPendingChange, redirectTo]
  )

  return (
    <GuestPage className='w-full max-w-lg text-left'>
      <GuestPage.Header>
        <GuestPage.Title size='prominent'>{labels.title}</GuestPage.Title>
        <GuestPage.Description tone='emphasis'>{displayEmail}</GuestPage.Description>
      </GuestPage.Header>
      <GuestPage.Content>
        <form className={guestForm} onSubmit={(e) => void onSubmit(e)}>
          <div className='flex w-full flex-col gap-[calc(var(--base)*1)]'>
            <GuestPage.Description>{labels.description}</GuestPage.Description>
            <OtpCodeField
              codeAriaLabel={labels.codeAriaLabel}
              disabled={disabled}
              length={codeLength}
              onValueChange={setCode}
              value={code}
            />
          </div>
          <div className={cx('flex w-full flex-col gap-2', 'form-submit')}>
            <Button
              className='btn btn--style-primary btn--size-large'
              disabled={disabled || code.length < codeLength}
              type='submit'
            >
              {labels.verify}
            </Button>
            <Button
              className={cx(
                'btn btn--size-large -mt-1 border-0 bg-transparent shadow-none',
                'self-start px-3',
                'text-[var(--theme-elevation-600)] hover:bg-[var(--theme-elevation-100)]',
                'disabled:cursor-not-allowed disabled:opacity-55'
              )}
              disabled={disabled || resendIn > 0}
              onClick={() => void sendOtp()}
              type='button'
            >
              <span className='inline-flex min-w-[10ch] items-center justify-center gap-1 tabular-nums'>
                {resendIn > 0
                  ? t('iam:rbac:loginOtpResendWait', { seconds: String(resendIn) })
                  : t('iam:rbac:loginOtpResend')}
              </span>
            </Button>
          </div>
        </form>
      </GuestPage.Content>
      <GuestPage.Back disabled={disabled} onClick={onBack}>
        {labels.back}
      </GuestPage.Back>
    </GuestPage>
  )
}
