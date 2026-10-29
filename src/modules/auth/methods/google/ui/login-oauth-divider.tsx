import { cx } from 'tailwind-variants'

type Props = {
  label: string
}

export default function LoginOAuthDivider({ label }: Props) {
  return (
    <div
      className={cx(
        'flex w-full items-center gap-3',
        'mt-10 mb-5',
        'text-[1.1rem] font-normal leading-tight text-[var(--theme-elevation-500)]',
        'before:h-px before:flex-1 before:bg-[var(--theme-elevation-150)] before:content-[""]',
        'after:h-px after:flex-1 after:bg-[var(--theme-elevation-150)] after:content-[""]'
      )}
    >
      {label}
    </div>
  )
}
