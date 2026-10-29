import type { ReactNode } from 'react'
import { guestLayoutContent, guestLayoutRoot, guestLayoutShell } from './guest.styles'
import GuestSecurityMeta from './guest-security-meta'
import GuestThemeToggle from './guest-theme-toggle'

type Props = {
  children: ReactNode
  logo?: ReactNode
}

/**
 * Layout for unauthenticated admin routes (login, invite accept, password reset, …).
 * Custom routes skip Payload `MinimalTemplate` — centered column via Tailwind; `login` hook for Payload form CSS.
 */
export default function GuestLayout({ children, logo }: Props) {
  return (
    <>
      <GuestSecurityMeta />
      <GuestThemeToggle />
      <section className={guestLayoutShell()}>
        <div className={guestLayoutContent()}>
          <div className={guestLayoutRoot()}>
            {logo ? <div>{logo}</div> : null}
            {children}
          </div>
        </div>
      </section>
    </>
  )
}
