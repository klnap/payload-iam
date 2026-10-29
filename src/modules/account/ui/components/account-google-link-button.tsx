'use client'

import { Button } from '@base-ui/react/button'
import { toast, useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'
import { useCallback } from 'react'
import { cx } from 'tailwind-variants'
import { GoogleBrandIcon, getIamAuthClient } from '#iam/modules/auth/ui'
import { ACCOUNT_LINKED_PATH } from '#iam/shared/paths/account-paths'

/** Account-only — mirrors login Google chrome; not imported from auth login UI. */
const accountGoogleLinkBtnClass = cx(
  'btn btn--size-large flex min-h-[2.75rem] w-auto shrink-0 items-center justify-center px-5 py-2.5',
  '[--bg-color:var(--theme-elevation-100)] [--hover-bg:var(--theme-elevation-50)]',
  '[--btn-border:1px_solid_var(--theme-elevation-100)] [--hover-btn-border:1px_solid_var(--theme-elevation-50)]',
  '[--color:var(--theme-text)]',
  '[html[data-theme=dark]_&]:[--bg-color:var(--theme-elevation-100)]',
  '[html[data-theme=dark]_&]:[--hover-bg:var(--theme-elevation-50)]',
  '[html[data-theme=dark]_&]:[--btn-border:1px_solid_var(--theme-elevation-50)]',
  '[html[data-theme=dark]_&]:[--hover-btn-border:1px_solid_var(--theme-elevation-50)]'
)

type Props = {
  label: string
  errorMessage: string
  disabled?: boolean
}

/** Link Google to the signed-in admin user (Better Auth `/link-social`). */
export default function AccountGoogleLinkButton({ label, errorMessage, disabled }: Props) {
  const { config } = useConfig()

  const handleLink = useCallback(async () => {
    if (disabled) return
    const adminRoute = config?.routes?.admin ?? '/admin'
    const callbackURL = formatAdminURL({
      adminRoute: adminRoute as `/${string}`,
      path: ACCOUNT_LINKED_PATH as `/${string}`,
    })
    try {
      const client = getIamAuthClient()
      const response = await client.$fetch<{ url?: string }>('/link-social', {
        method: 'POST',
        body: { provider: 'google', callbackURL },
      })
      if (!response || typeof response !== 'object' || !('url' in response)) {
        toast.error(errorMessage)
        return
      }
      const url = response.url
      if (typeof url !== 'string' || !url) {
        toast.error(errorMessage)
        return
      }
      window.location.assign(url)
    } catch {
      toast.error(errorMessage)
    }
  }, [disabled, errorMessage, config?.routes?.admin])

  return (
    <div className='form-submit m-0 w-auto shrink-0'>
      <Button
        className={accountGoogleLinkBtnClass}
        disabled={disabled}
        onClick={() => void handleLink()}
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
