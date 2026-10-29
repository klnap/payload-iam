type Props = {
  className?: string
}

export function SessionDeviceIcon({ className }: Props) {
  return (
    <svg
      aria-hidden
      className={className}
      fill='none'
      height='20'
      viewBox='0 0 20 20'
      width='20'
      xmlns='http://www.w3.org/2000/svg'
    >
      <rect height='12' rx='1.5' stroke='currentColor' strokeWidth='1.25' width='16' x='2' y='4' />
      <path d='M7 16h6' stroke='currentColor' strokeLinecap='round' strokeWidth='1.25' />
    </svg>
  )
}

export function SessionMobileIcon({ className }: Props) {
  return (
    <svg
      aria-hidden
      className={className}
      fill='none'
      height='20'
      viewBox='0 0 20 20'
      width='20'
      xmlns='http://www.w3.org/2000/svg'
    >
      <rect height='14' rx='2' stroke='currentColor' strokeWidth='1.25' width='9' x='5.5' y='3' />
      <circle cx='10' cy='14.5' fill='currentColor' r='0.75' />
    </svg>
  )
}
