'use client'

import { Button } from '@base-ui/react/button'
import { toast } from '@payloadcms/ui'
import { type FormEvent, useCallback, useState } from 'react'
import { cx } from 'tailwind-variants'
import { HttpJsonError, postIamJson } from '#iam/shared/http/json-fetch'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'
import { guestForm } from '#iam/shared/ui/guest/guest-payload-form'

type Props = {
  labels: {
    email: string
    submit: string
    submitting: string
    success: string
    error: string
  }
}

export default function ForgotPasswordForm({ labels }: Props) {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setPending(true)
      const email = String(new FormData(event.currentTarget).get('email') ?? '')
      try {
        await postIamJson(IAM_API_PATH.users.requestPasswordEmail, { email })
        setSent(true)
      } catch (err) {
        toast.error(err instanceof HttpJsonError ? err.message : labels.error)
      } finally {
        setPending(false)
      }
    },
    [labels.error]
  )

  if (sent) {
    return (
      <div className={cx(guestForm, 'mb-7', 'mt-0')} role='status'>
        <div
          className={cx(
            'rounded-[var(--style-radius-m,4px)]',
            'border border-[var(--theme-elevation-150)] bg-[var(--theme-elevation-50)]',
            'px-5 py-4'
          )}
        >
          <p className='m-0 text-[0.9375rem] leading-normal text-[var(--theme-elevation-800)]'>
            {labels.success}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form className={guestForm} onSubmit={(e) => void onSubmit(e)}>
      <div className='field-type email'>
        <label className='field-label' htmlFor='field-forgot-email'>
          {labels.email}
        </label>
        <div className='field-type__wrap'>
          <input autoComplete='email' id='field-forgot-email' name='email' required type='email' />
        </div>
      </div>
      <div className={cx('form-submit')}>
        <Button className='btn btn--style-primary btn--size-large' disabled={pending} type='submit'>
          {pending ? labels.submitting : labels.submit}
        </Button>
      </div>
    </form>
  )
}
