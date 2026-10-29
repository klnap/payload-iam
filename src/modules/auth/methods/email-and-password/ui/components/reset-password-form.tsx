'use client'

import { Button } from '@base-ui/react/button'
import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { type FormEvent, useCallback, useState } from 'react'
import { cx } from 'tailwind-variants'
import { HttpJsonError, postIamAuthJson } from '#iam/shared/http/json-fetch'
import { IAM_AUTH_ROUTES } from '#iam/shared/paths/auth-routes'
import { guestForm } from '#iam/shared/ui/guest/guest-payload-form'

type PasswordTokenFlow = 'reset' | 'set'

type Props = {
  token: string
  flow?: PasswordTokenFlow
  adminRoute: string
  loginRoute: string
  labels: {
    password: string
    confirmPassword: string
    submit: string
    error: string
  }
}

export default function ResetPasswordForm({
  token,
  flow = 'reset',
  adminRoute,
  loginRoute,
  labels,
}: Props) {
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      const password = String(new FormData(form).get('password') ?? '')
      const confirm = String(new FormData(form).get('confirm-password') ?? '')
      if (password !== confirm) {
        toast.error(labels.error)
        return
      }
      setPending(true)
      try {
        const path =
          flow === 'set'
            ? IAM_AUTH_ROUTES.emailAndPassword.setPassword
            : IAM_AUTH_ROUTES.emailAndPassword.resetPassword
        await postIamAuthJson(path, { newPassword: password, token })
        router.push(
          formatAdminURL({
            adminRoute: adminRoute as `/${string}`,
            path: loginRoute as `/${string}`,
          })
        )
      } catch (err) {
        toast.error(err instanceof HttpJsonError ? err.message : labels.error)
      } finally {
        setPending(false)
      }
    },
    [adminRoute, flow, labels.error, loginRoute, router, token]
  )

  return (
    <form className={guestForm} onSubmit={(e) => void onSubmit(e)}>
      <div className='field-type password'>
        <label className='field-label' htmlFor='field-reset-password'>
          {labels.password}
        </label>
        <div className='field-type__wrap'>
          <input
            autoComplete='new-password'
            id='field-reset-password'
            name='password'
            required
            type='password'
          />
        </div>
      </div>
      <div className='field-type password'>
        <label className='field-label' htmlFor='field-reset-confirm'>
          {labels.confirmPassword}
        </label>
        <div className='field-type__wrap'>
          <input
            autoComplete='new-password'
            id='field-reset-confirm'
            name='confirm-password'
            required
            type='password'
          />
        </div>
      </div>
      <div className={cx('form-submit', 'mt-8')}>
        <Button className='btn btn--style-primary btn--size-large' disabled={pending} type='submit'>
          {labels.submit}
        </Button>
      </div>
    </form>
  )
}
