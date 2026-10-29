import { tv } from 'tailwind-variants'

/** Vertical rhythm between header, main content, and back action on guest pages. */
export const guestPage = tv({
  base: ['flex w-full flex-col', 'gap-[calc(var(--base)*1.85)]'],
})

/** Title + optional description grouped as one intro block. */
export const guestPageHeader = tv({
  base: ['flex w-full flex-col', 'gap-2'],
})

export const guestPageTitle = tv({
  base: 'm-0 font-semibold text-[var(--theme-text)]',
  variants: {
    size: {
      default: 'text-xl',
      prominent: 'text-2xl',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

export const guestPageDescription = tv({
  base: 'm-0 max-w-md text-base leading-snug text-[var(--theme-elevation-500)]',
  variants: {
    tone: {
      default: '',
      emphasis: [
        'w-full rounded-[var(--style-radius-m,4px)] py-5 text-left',
        'text-lg leading-relaxed underline underline-offset-6',
      ],
    },
  },
  defaultVariants: {
    tone: 'default',
  },
})

/** Column inside Payload `MinimalTemplate` (viewport sizing: `iam-guest-shell.css`). */
export const guestLayoutShell = tv({
  base: ['iam-guest-shell', 'box-border w-full'],
})

/** Max width of the guest page column inside the shell. */
export const guestLayoutContent = tv({
  base: 'w-full max-w-lg',
})

/**
 * Payload `login` root inside the column — stacks optional logo and page body.
 * Keeps stock admin login CSS hooks on the outer flex column.
 */
export const guestLayoutRoot = tv({
  base: ['login', 'flex w-full flex-col', 'gap-[calc(var(--base)*1)]'] as const,
})
