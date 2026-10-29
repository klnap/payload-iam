'use client'

import type { ComponentProps } from 'react'
import { cn } from 'tailwind-variants'
import { guestInlineLink } from './guest-payload-form'

const guestPageBackClass = cn(guestInlineLink, 'guest-page-back m-0')

type LinkProps = ComponentProps<'a'> & {
  href: string
}

export function GuestPageBackLink({ className, children, href, ...props }: LinkProps) {
  return (
    <a className={cn(guestPageBackClass, className)} href={href} {...props}>
      {children}
    </a>
  )
}

type ButtonProps = {
  children: ComponentProps<'button'>['children']
  className?: string
  disabled?: boolean
  onClick: () => void
}

export function GuestPageBackButton({ children, className, disabled, onClick }: ButtonProps) {
  return (
    <button
      className={cn(
        guestPageBackClass,
        'w-fit cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-55',
        className
      )}
      disabled={disabled}
      onClick={onClick}
      type='button'
    >
      {children}
    </button>
  )
}
