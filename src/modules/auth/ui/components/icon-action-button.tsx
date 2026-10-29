'use client'

import { Button } from '@base-ui/react/button'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from 'tailwind-variants'

type Props = Omit<ComponentProps<typeof Button>, 'className'> & {
  children: ReactNode
  className?: string
}

/** Compact icon-only control beside credential fields (copy, reveal, etc.). */
export function IconActionButton({ className, children, ...props }: Props) {
  return (
    <Button
      className={cn(
        'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0',
        'text-[var(--theme-elevation-500)] hover:bg-transparent hover:text-[var(--theme-text)]',
        '[&_svg]:block [&_svg]:h-5 [&_svg]:w-5',
        className
      )}
      type='button'
      {...props}
    >
      {children}
    </Button>
  )
}
