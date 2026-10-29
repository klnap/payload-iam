'use client'

import { Button, toast } from '@payloadcms/ui'
import { type FormEvent, useCallback, useState } from 'react'
import { cx } from 'tailwind-variants'
import { AccountReadyPanel, GoogleLoginButton, LoginOAuthDivider } from '#iam/modules/auth/ui'
import { clearStoredInviteSession } from '#iam/modules/invitations/ui/hooks/invite-accept-token-storage'
import { HttpJsonError, postIamAuthJson } from '#iam/shared/http/json-fetch'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { IAM_AUTH_ROUTES } from '#iam/shared/paths/auth-routes'
import { offerBrowserPasswordSave } from '#iam/shared/ui/guest/browser-credential-save'
import { GuestPage } from '#iam/shared/ui/guest/guest-page'
import { guestForm, guestFormInputWrap } from '#iam/shared/ui/guest/guest-payload-form'

type Props = {
  adminRoute: string
  invitationId: string
  token: string
  email: string
  google: boolean
  emailAndPassword: boolean
  oauthErrorCallbackURL?: string
  googleLabel: string
  unauthorizedLabel: string
  orContinueWithLabel: string
}

export type InviteAcceptFormProps = Props

async function bindInviteGoogle(invitationId: string, token: string): Promise<boolean> {
  try {
    await postIamAuthJson(IAM_AUTH_ROUTES.google.inviteBind, { invitationId, token })
    return true
  } catch (err) {
    toast.error(err instanceof HttpJsonError ? err.message : 'Could not prepare Google sign-in')
    return false
  }
}

/** Invite accept — auto password or Google-only (FIRST_GOOGLE). */
export default function InviteAcceptForm({
  adminRoute,
  invitationId,
  token,
  email,
  google,
  emailAndPassword,
  oauthErrorCallbackURL,
  googleLabel,
  unauthorizedLabel,
  orContinueWithLabel,
}: Props) {
  const { t } = useIamTranslation()
  const inviteTitle = t('iam:rbac:adminViewTitleInviteAccept')
  const [pending, setPending] = useState(false)
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)

  const onBindGoogle = useCallback(async () => {
    return bindInviteGoogle(invitationId, token)
  }, [invitationId, token])

  const onActivate = useCallback(
    async (event?: FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      setPending(true)
      try {
        const acceptBody = await postIamAuthJson<{
          status?: boolean
          error?: string
          message?: string
          generatedPassword?: string
        }>(IAM_AUTH_ROUTES.invitations.accept, { invitationId, token })
        if (acceptBody.error || !acceptBody.status) {
          toast.error(acceptBody.message || acceptBody.error || 'Could not accept invitation')
          return
        }
        const generated = acceptBody.generatedPassword
        if (!generated) {
          toast.error('Could not accept invitation')
          return
        }
        setPassword(generated)
        clearStoredInviteSession()
        await offerBrowserPasswordSave(email, generated)
        setDone(true)
      } catch (err) {
        toast.error(err instanceof HttpJsonError ? err.message : 'Could not accept invitation')
      } finally {
        setPending(false)
      }
    },
    [email, invitationId, token]
  )

  if (done) {
    return (
      <AccountReadyPanel
        adminRoute={adminRoute}
        description='Save your generated password, then sign in to the admin panel.'
        email={email}
        heading='Your account is ready'
        password={password}
        passwordLabel='Generated password'
        unauthorizedMessage={unauthorizedLabel}
      />
    )
  }

  if (google && !emailAndPassword) {
    return (
      <GuestPage>
        <GuestPage.Header>
          <GuestPage.Title>{inviteTitle}</GuestPage.Title>
          <GuestPage.Description>
            You have been invited to the admin panel.
            <br />
            Continue with Google to activate your account.
          </GuestPage.Description>
        </GuestPage.Header>
        <GuestPage.Content>
          <div className={guestForm}>
            <GoogleLoginButton
              callbackURL={adminRoute}
              disabled={pending}
              errorCallbackURL={oauthErrorCallbackURL}
              errorMessage={unauthorizedLabel}
              label={googleLabel}
              onBeforeOAuth={onBindGoogle}
              onPendingChange={setPending}
            />
          </div>
        </GuestPage.Content>
      </GuestPage>
    )
  }

  return (
    <GuestPage>
      <GuestPage.Header>
        <GuestPage.Title>{inviteTitle}</GuestPage.Title>
        <GuestPage.Description>
          You have been invited to the admin panel.
          <br />
          Activate your account below to sign in.
        </GuestPage.Description>
      </GuestPage.Header>
      <GuestPage.Content>
        <form className={cx(guestForm, 'flex flex-col gap-0')} onSubmit={(e) => void onActivate(e)}>
          {google ? (
            <>
              <GoogleLoginButton
                callbackURL={adminRoute}
                disabled={pending}
                errorCallbackURL={oauthErrorCallbackURL}
                errorMessage={unauthorizedLabel}
                label={googleLabel}
                onBeforeOAuth={onBindGoogle}
                onPendingChange={setPending}
              />
              <LoginOAuthDivider label={orContinueWithLabel} />
            </>
          ) : null}
          <div className={cx(guestFormInputWrap)}>
            <div className='field-type email'>
              <label className='field-label' htmlFor='field-email'>
                Email
              </label>
              <div className='field-type__wrap'>
                <input
                  aria-readonly='true'
                  autoComplete='username'
                  className='pointer-events-none cursor-default bg-[var(--theme-elevation-50)] text-[var(--theme-elevation-500)]'
                  id='field-email'
                  name='username'
                  readOnly
                  tabIndex={-1}
                  type='email'
                  value={email}
                />
              </div>
            </div>
          </div>
          <div
            className={cx('form-submit', 'mt-10 flex flex-col gap-3 [&_.btn]:m-0 [&_.btn]:w-full')}
          >
            <Button buttonStyle='primary' disabled={pending} size='large' type='submit'>
              {pending ? 'Activating…' : 'Activate'}
            </Button>
          </div>
        </form>
      </GuestPage.Content>
    </GuestPage>
  )
}
