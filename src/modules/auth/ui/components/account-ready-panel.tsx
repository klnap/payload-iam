'use client'

import { Button } from '@payloadcms/ui'
import { useCallback, useState } from 'react'
import { cx } from 'tailwind-variants'
import { GeneratedPasswordField } from '#iam/modules/auth/methods/email-and-password/ui/components/generated-password-field'
import { signInWithEmailAndRedirect } from '#iam/modules/auth/ui/hooks/sign-in-email-redirect'
import {
  downloadCredentials,
  offerBrowserPasswordSave,
} from '#iam/shared/ui/guest/browser-credential-save'
import { GuestPage } from '#iam/shared/ui/guest/guest-page'
import { guestForm, payloadLoginGenerateButton } from '#iam/shared/ui/guest/guest-payload-form'

type Props = {
  adminRoute: string
  email: string
  password: string
  heading: string
  description: string
  passwordLabel: string
  unauthorizedMessage?: string
  onBeforeDownload?: () => void
}

export function AccountReadyPanel({
  adminRoute,
  email,
  password,
  heading,
  description,
  passwordLabel,
  unauthorizedMessage,
  onBeforeDownload,
}: Props) {
  const [loginPending, setLoginPending] = useState(false)
  const redirectTo = adminRoute || '/'

  const onLogin = useCallback(async () => {
    setLoginPending(true)
    await offerBrowserPasswordSave(email, password)
    const ok = await signInWithEmailAndRedirect({
      adminRoute,
      email,
      password,
      redirectTo,
      unauthorizedMessage,
    })
    if (!ok) setLoginPending(false)
  }, [adminRoute, email, password, redirectTo, unauthorizedMessage])

  return (
    <GuestPage>
      <GuestPage.Header>
        <GuestPage.Title>{heading}</GuestPage.Title>
        <GuestPage.Description>{description}</GuestPage.Description>
      </GuestPage.Header>
      <GuestPage.Content>
        <div className={guestForm}>
          <GeneratedPasswordField label={passwordLabel} password={password} />
          <div className='mt-8 flex flex-col gap-3 [&_.btn]:m-0 [&_.btn]:w-full'>
            <Button
              buttonStyle='subtle'
              className={cx(payloadLoginGenerateButton, 'btn', 'btn--size-large', 'w-full')}
              disabled={loginPending}
              onClick={() => {
                onBeforeDownload?.()
                downloadCredentials({ adminRoute, email, password })
              }}
              size='large'
              type='button'
            >
              Download credentials
            </Button>
            <Button
              buttonStyle='primary'
              disabled={loginPending}
              onClick={() => void onLogin()}
              size='large'
              type='button'
            >
              {loginPending ? 'Signing in…' : 'Go to dashboard'}
            </Button>
          </div>
        </div>
      </GuestPage.Content>
    </GuestPage>
  )
}
