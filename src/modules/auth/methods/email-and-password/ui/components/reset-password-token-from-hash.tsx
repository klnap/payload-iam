'use client'

import { useEffect, useState } from 'react'
import { GuestPage } from '#iam/shared/ui/guest/guest-page'
import { guestForm } from '#iam/shared/ui/guest/guest-payload-form'
import ResetPasswordForm from './reset-password-form'

type Props = {
  adminRoute: string
  loginRoute: string
  labels: {
    password: string
    confirmPassword: string
    submit: string
    error: string
  }
}

/** Reads `token` from URL hash (`#token=…`) as sent by payload-iam reset emails. */
export default function ResetPasswordTokenFromHash(props: Props) {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    // Email links use `#token=…`; optional legacy `#iam…` prefix must not leave a leading `#` for URLSearchParams.
    const hash = window.location.hash.replace(/^#/, '').replace(/^iam/, '')
    const params = new URLSearchParams(hash)
    const fromHash = params.get('token')
    if (fromHash) {
      setToken(fromHash)
      return
    }
    const fromQuery = new URLSearchParams(window.location.search).get('token')
    setToken(fromQuery)
  }, [])

  if (!token) {
    return (
      <GuestPage>
        <GuestPage.Content>
          <div className={guestForm} role='alert'>
            <GuestPage.Description>{props.labels.error}</GuestPage.Description>
          </div>
        </GuestPage.Content>
      </GuestPage>
    )
  }

  return <ResetPasswordForm token={token} {...props} />
}
