'use client'

import { Button } from '@base-ui/react/button'
import { toast } from '@payloadcms/ui'
import { useCallback } from 'react'
import { cx } from 'tailwind-variants'
import { getIamAuthClient } from '#iam/modules/auth/ui/client/auth-client'
import GoogleBrandIcon from './google-brand-icon'

type Props = {
  callbackURL: string
  errorCallbackURL?: string
  label: string
  errorMessage: string
  disabled?: boolean
  onPendingChange?: (pending: boolean) => void
  /** When false, OAuth does not start (e.g. invite bind failed). */
  onBeforeOAuth?: () => Promise<boolean>
}

const googleBtnClass = cx(
  'btn btn--size-large flex w-full min-h-[3.25rem] items-center justify-center py-3.5',
  '[--bg-color:var(--theme-elevation-100)] [--hover-bg:var(--theme-elevation-50)]',
  '[--btn-border:1px_solid_var(--theme-elevation-100)] [--hover-btn-border:1px_solid_var(--theme-elevation-50)]',
  '[--color:var(--theme-text)]',
  '[html[data-theme=dark]_&]:[--bg-color:var(--theme-elevation-100)]',
  '[html[data-theme=dark]_&]:[--hover-bg:var(--theme-elevation-50)]',
  '[html[data-theme=dark]_&]:[--btn-border:1px_solid_var(--theme-elevation-50)]',
  '[html[data-theme=dark]_&]:[--hover-btn-border:1px_solid_var(--theme-elevation-50)]'
)

/** Starts Better Auth Google OAuth (client-only — needs browser redirect). */
export default function GoogleLoginButton({
  callbackURL,
  errorCallbackURL,
  label,
  errorMessage,
  disabled,
  onPendingChange,
  onBeforeOAuth,
}: Props) {
  const handleGoogleLogin = useCallback(async () => {
    if (disabled) return
    onPendingChange?.(true)
    try {
      if (onBeforeOAuth) {
        const ok = await onBeforeOAuth()
        if (!ok) {
          onPendingChange?.(false)
          return
        }
      }
      const { data, error } = await getIamAuthClient().signIn.social({
        provider: 'google',
        callbackURL,
        ...(errorCallbackURL ? { errorCallbackURL } : {}),
      })
      if (error || !data?.url) {
        toast.error(errorMessage)
        onPendingChange?.(false)
        return
      }
      window.location.assign(data.url)
    } catch {
      toast.error(errorMessage)
      onPendingChange?.(false)
    }
  }, [callbackURL, disabled, errorCallbackURL, errorMessage, onBeforeOAuth, onPendingChange])

  return (
    <div className={cx('form-submit m-0 w-full')}>
      <Button
        className={googleBtnClass}
        disabled={disabled}
        onClick={() => void handleGoogleLogin()}
        type='button'
      >
        <span className='inline-flex min-h-6 items-center justify-center gap-3 leading-none [&_svg]:block'>
          <GoogleBrandIcon />
          <span className='text-[1.0625rem] font-medium leading-tight'>{label}</span>
        </span>
      </Button>
    </div>
  )
}
