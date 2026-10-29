type Props = {
  className?: string
}

const svgProps = {
  fill: 'none' as const,
  height: 18,
  viewBox: '0 0 24 24',
  width: 18,
  xmlns: 'http://www.w3.org/2000/svg',
}

const strokeGroup = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2,
}

/** Field read-only — lock on. */
export function PadlockClosedIcon({ className }: Props) {
  return (
    <svg aria-hidden className={className} {...svgProps}>
      <g {...strokeGroup}>
        <rect height={12} rx={2} width={18} x={3} y={10} />
        <path d='M6 6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v4H6z' />
      </g>
    </svg>
  )
}

/** Field editable — lock off. */
export function PadlockOpenIcon({ className }: Props) {
  return (
    <svg aria-hidden className={className} {...svgProps}>
      <g {...strokeGroup}>
        <rect height={12} rx={2} width={18} x={3} y={10} />
        <path d='M6 10V5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1' />
      </g>
    </svg>
  )
}
