import type { ComponentProps, ReactNode } from 'react'
import { cn } from 'tailwind-variants'
import { guestPage, guestPageDescription, guestPageHeader, guestPageTitle } from './guest.styles'
import { GuestPageBackButton, GuestPageBackLink } from './guest-page-back'

type GuestPageProps = {
  children: ReactNode
  className?: string
}

function GuestPageRoot({ children, className }: GuestPageProps) {
  return <div className={guestPage({ className })}>{children}</div>
}

function GuestPageHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <header className={guestPageHeader({ className })}>{children}</header>
}

type GuestPageTitleProps = ComponentProps<'h1'> & {
  size?: 'default' | 'prominent'
}

function GuestPageTitle({ className, size, ...props }: GuestPageTitleProps) {
  return <h1 className={guestPageTitle({ size, className })} {...props} />
}

type GuestPageDescriptionProps = ComponentProps<'p'> & {
  tone?: 'default' | 'emphasis'
}

function GuestPageDescription({ className, tone, ...props }: GuestPageDescriptionProps) {
  return <p className={guestPageDescription({ tone, className })} {...props} />
}

function GuestPageContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('w-full', className)}>{children}</div>
}

type GuestPageBackProps =
  | {
      children: ReactNode
      className?: string
      href: string
      onClick?: never
      disabled?: never
    }
  | {
      children: ReactNode
      className?: string
      href?: never
      onClick: () => void
      disabled?: boolean
    }

function GuestPageBack(props: GuestPageBackProps) {
  if ('href' in props && props.href) {
    const { children, className, href } = props
    return (
      <GuestPageBackLink className={className} href={href}>
        {children}
      </GuestPageBackLink>
    )
  }

  const { children, className, disabled, onClick } = props as Extract<
    GuestPageBackProps,
    { onClick: () => void }
  >
  return (
    <GuestPageBackButton className={className} disabled={disabled} onClick={onClick}>
      {children}
    </GuestPageBackButton>
  )
}

export const GuestPage = Object.assign(GuestPageRoot, {
  Header: GuestPageHeader,
  Title: GuestPageTitle,
  Description: GuestPageDescription,
  Content: GuestPageContent,
  Back: GuestPageBack,
})
