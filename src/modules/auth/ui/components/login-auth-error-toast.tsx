'use client'

import { toast } from '@payloadcms/ui'
import { useEffect, useRef } from 'react'
import type { LoginAuthErrorCode } from '#iam/modules/auth/ui/hooks/login-auth-error-code'

type Props = {
  authError?: LoginAuthErrorCode | null
  message: string
}

/** One-shot toast after OAuth redirect with `?error=` (Better Auth) on admin login. */
export default function LoginAuthErrorToast({ authError, message }: Props) {
  const shown = useRef(false)

  useEffect(() => {
    if (!authError || shown.current) return
    shown.current = true
    toast.error(message)

    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    url.searchParams.delete('error_description')
    url.searchParams.delete('authError')
    const next = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState({}, '', next)
  }, [authError, message])

  return null
}
