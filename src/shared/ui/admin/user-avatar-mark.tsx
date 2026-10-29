import { tv } from 'tailwind-variants'
import { getInitials } from './initials'

type Props = {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

// NOTE: class names must be literal strings in tv() — no variable interpolation.
const userAvatarMark = tv({
  slots: {
    root: [
      'grid shrink-0 place-items-center rounded-full',
      'bg-[var(--theme-elevation-150)] text-[var(--theme-elevation-800)]',
    ],
    letter: 'block font-normal leading-none',
  },
  variants: {
    size: {
      sm: {
        root: [
          'size-7',
          'shadow-[0_0_0_0.0625rem_var(--theme-bg),0_0_0_0.125rem_var(--theme-elevation-150)]',
        ],
        letter: 'translate-y-[0.06em] text-[0.95rem]',
      },
      md: {
        root: [
          'size-[2.5rem]',
          'shadow-[0_0_0_0.125rem_var(--theme-bg),0_0_0_0.1875rem_var(--theme-elevation-150)]',
        ],
        letter: 'translate-y-[0.06em] text-[1.4rem]',
      },
      lg: {
        root: [
          'size-20',
          'shadow-[0_0_0_0.2rem_var(--theme-bg),0_0_0_0.3rem_var(--theme-elevation-150)]',
        ],
        letter: 'translate-y-[0.04em] text-[2.1rem]',
      },
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

/** Letter avatar — same mark as sidebar footer. */
export function UserAvatarMark({ name, size = 'md' }: Props) {
  const letter = getInitials(name)
  const styles = userAvatarMark({ size })

  return (
    <span aria-hidden className={styles.root()}>
      <span className={styles.letter()}>{letter}</span>
    </span>
  )
}
