'use client'

import { Button, toast } from '@payloadcms/ui'
import { type FormEvent, useCallback, useState } from 'react'
import { cx } from 'tailwind-variants'
import { AccountReadyPanel } from '#iam/modules/auth/ui'
import { HttpJsonError, postIamJson } from '#iam/shared/http/json-fetch'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'
import { offerBrowserPasswordSave } from '#iam/shared/ui/guest/browser-credential-save'
import { GuestPage } from '#iam/shared/ui/guest/guest-page'
import { guestForm, guestFormInputWrap } from '#iam/shared/ui/guest/guest-payload-form'

type Props = {
  adminRoute: string
  labels: {
    title: string
    description: string
    email: string
    fullName: string
    submit: string
    fullNameRequired: string
    emailRequired: string
    error: string
  }
}

/** First-run Root Admin — auto-generated password; success = reveal + download + login. */
export default function CreateRootForm({ adminRoute, labels }: Props) {
  const [pending, setPending] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!fullName.trim()) {
        toast.error(labels.fullNameRequired)
        return
      }
      if (!email.trim()) {
        toast.error(labels.emailRequired)
        return
      }
      setPending(true)
      try {
        const data = await postIamJson<{ generatedPassword?: string }>(
          IAM_API_PATH.bootstrap.root,
          {
            email: email.trim(),
            fullName: fullName.trim(),
          }
        )
        if (!data.generatedPassword) {
          toast.error(labels.error)
          return
        }
        setPassword(data.generatedPassword)
        await offerBrowserPasswordSave(email.trim().toLowerCase(), data.generatedPassword)
        setDone(true)
      } catch (err) {
        toast.error(err instanceof HttpJsonError ? err.message : labels.error)
      } finally {
        setPending(false)
      }
    },
    [email, fullName, labels.emailRequired, labels.error, labels.fullNameRequired]
  )

  if (done) {
    return (
      <AccountReadyPanel
        adminRoute={adminRoute}
        description='Save your generated password, then sign in to the admin panel.'
        email={email.trim().toLowerCase()}
        heading='Your Root Admin account is ready'
        password={password}
        passwordLabel='Generated password'
        unauthorizedMessage={labels.error}
      />
    )
  }

  return (
    <GuestPage>
      <GuestPage.Header>
        <GuestPage.Title>{labels.title}</GuestPage.Title>
        <GuestPage.Description>{labels.description}</GuestPage.Description>
      </GuestPage.Header>
      <GuestPage.Content>
        <form className={cx(guestForm)} onSubmit={(e) => void onSubmit(e)}>
          <div className={cx(guestFormInputWrap)}>
            <div className='field-type text'>
              <label className='field-label' htmlFor='field-fullName'>
                {labels.fullName}
              </label>
              <div className='field-type__wrap'>
                <input
                  autoComplete='name'
                  id='field-fullName'
                  name='fullName'
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  type='text'
                  value={fullName}
                />
              </div>
            </div>
            <div className='field-type email'>
              <label className='field-label' htmlFor='field-email'>
                {labels.email}
              </label>
              <div className='field-type__wrap'>
                <input
                  autoComplete='username'
                  id='field-email'
                  name='email'
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
              {pending ? 'Creating…' : labels.submit}
            </Button>
          </div>
        </form>
      </GuestPage.Content>
    </GuestPage>
  )
}
