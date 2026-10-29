type Props = {
  className?: string
}

export function GuestThemeIcon({ className }: Props) {
  return (
    <svg
      aria-hidden
      className={className}
      height='1em'
      viewBox='0 0 20 20'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M0 0h20v20H0z' fill='none' />
      <path d='M10 3a7 7 0 1 1 0 14zm0-1a8 8 0 1 0 0 16a8 8 0 0 0 0-16' fill='currentColor' />
    </svg>
  )
}
