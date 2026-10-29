'use client'

import { Button } from '@base-ui/react/button'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from 'tailwind-variants'

type SlotProps = ComponentProps<'div'>

/** Relative wrapper for a password input with a trailing reveal control. */
export function PasswordInputSlot({ className, children, ...props }: SlotProps) {
  return (
    <div className={cn('relative [&_input]:pr-11', className)} {...props}>
      {children}
    </div>
  )
}

type RevealProps = Omit<ComponentProps<typeof Button>, 'className'> & {
  children: ReactNode
  className?: string
}

export function PasswordRevealButton({ className, children, ...props }: RevealProps) {
  return (
    <Button
      className={cn(
        'absolute right-[0.55rem] top-1/2 z-[1] inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[var(--style-radius-s,4px)] border-0 bg-transparent p-0 text-[var(--theme-elevation-500)] hover:bg-[var(--theme-elevation-50)] hover:text-[var(--theme-text)] [&_svg]:h-5 [&_svg]:w-5',
        className
      )}
      type='button'
      {...props}
    >
      {children}
    </Button>
  )
}
