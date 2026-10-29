'use client'

import { toast } from '@payloadcms/ui'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { requestHasPendingLoginOtpCookie } from '#iam/adapters/better-auth/cookie-names'
import { getIamAuthClient } from '#iam/modules/auth/ui/client/auth-client'
import {
  clearLoginOtpEmailStorage,
  persistLoginOtpEmail,
  readLoginOtpEmail,
} from './login-otp-email-storage'

type UseLoginFormArgs = {
  loginOtp: boolean
  redirectTo: string
  unauthorizedMessage: string
  /** Server saw `two_factor` cookie — resume OTP step after refresh. */
  pendingLoginOtp?: boolean
  pendingOtpEmail?: string
  prefillOtpCode?: string
}

export function useLoginForm({
  loginOtp,
  redirectTo,
  unauthorizedMessage,
  pendingLoginOtp = false,
  pendingOtpEmail,
  prefillOtpCode,
}: UseLoginFormArgs) {
  const [pending, setPending] = useState(false)
  const [otpStepActive, setOtpStepActive] = useState(
    () => loginOtp && (pendingLoginOtp || Boolean(prefillOtpCode?.trim()))
  )
  const [otpEmail, setOtpEmail] = useState(
    () => pendingOtpEmail?.trim() || readLoginOtpEmail() || ''
  )

  useEffect(() => {
    const fromServer = pendingOtpEmail?.trim()
    if (!fromServer) return
    persistLoginOtpEmail(fromServer)
    setOtpEmail(fromServer)
  }, [pendingOtpEmail])
  const submitInFlight = useRef(false)

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (submitInFlight.current) return
      submitInFlight.current = true
      setPending(true)
      const form = event.currentTarget
      const emailValue = String(new FormData(form).get('email') ?? '')
      const password = String(new FormData(form).get('password') ?? '')
      try {
        const { data, error } = await getIamAuthClient().signIn.email({
          email: emailValue,
          password,
          // callbackURL makes BA return `redirect` + `url`; client redirect plugin navigates before OTP UI.
          ...(loginOtp ? {} : { callbackURL: redirectTo }),
        })
        if (error) {
          toast.error(unauthorizedMessage)
          return
        }
        const twoFactorRedirect =
          data &&
          typeof data === 'object' &&
          'twoFactorRedirect' in data &&
          (data as { twoFactorRedirect?: boolean }).twoFactorRedirect === true
        const pendingOtpChallenge =
          loginOtp &&
          (twoFactorRedirect ||
            (typeof document !== 'undefined' && requestHasPendingLoginOtpCookie(document.cookie)))
        if (pendingOtpChallenge) {
          const hint =
            typeof (data as unknown as { email?: unknown } | null)?.email === 'string'
              ? (data as unknown as { email: string }).email
              : emailValue
          persistLoginOtpEmail(hint)
          setOtpEmail(hint)
          setOtpStepActive(true)
          return
        }
        window.location.assign(redirectTo)
      } catch {
        toast.error(unauthorizedMessage)
      } finally {
        submitInFlight.current = false
        setPending(false)
      }
    },
    [loginOtp, redirectTo, unauthorizedMessage]
  )

  const clearOtpEmail = useCallback(() => {
    clearLoginOtpEmailStorage()
    setOtpEmail('')
    setOtpStepActive(false)
  }, [])

  return {
    pending,
    setPending,
    otpStepActive,
    otpEmail,
    clearOtpEmail,
    onSubmit,
  }
}
