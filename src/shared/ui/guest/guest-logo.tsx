import 'server-only'

import { Logo } from '@payloadcms/next/rsc'
import { cx } from 'tailwind-variants'
import type { GuestLogoProps } from './guest-logo-props'

/** Payload admin logo above guest auth routes. */
export default function GuestLogo({ initPageResult, params, searchParams }: GuestLogoProps) {
  const { locale, permissions, req } = initPageResult
  const { i18n, payload, user } = req

  return (
    <div className={cx('flex w-full justify-center')}>
      <Logo
        i18n={i18n}
        locale={locale}
        params={params}
        payload={payload}
        permissions={permissions}
        searchParams={searchParams}
        user={user ?? undefined}
      />
    </div>
  )
}
