'use client'

import { OTPField } from '@base-ui/react/otp-field'
import { useId } from 'react'
import { cx } from 'tailwind-variants'

type Props = {
  length: number
  /** Screen-reader label only (no visible caption). */
  codeAriaLabel: string
  disabled?: boolean
  value: string
  onValueChange: (value: string) => void
}

const cellClass = cx(
  'iam-otp-code-field__cell',
  'box-border !m-0 !box-border !p-0',
  // Payload `.login__form input { width: 100% }` — reset so slots stay square.
  '!h-auto !min-h-0 !w-full !max-w-[4rem] !min-w-0',
  'aspect-square justify-self-center',
  'rounded-[var(--style-radius-m,4px)]',
  'border border-[var(--theme-elevation-150)] bg-[var(--theme-elevation-0)]',
  'text-center text-2xl font-medium tabular-nums leading-none',
  'text-[var(--theme-text)] caret-[var(--theme-text)]',
  'outline-none',
  'focus:border-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-elevation-150)]'
)

export default function OtpCodeField({
  length,
  codeAriaLabel,
  disabled,
  value,
  onValueChange,
}: Props) {
  const fieldId = useId()

  return (
    <div className='iam-otp-code-field w-full'>
      <label className='sr-only' htmlFor={fieldId}>
        {codeAriaLabel}
      </label>
      <OTPField.Root
        className='grid w-full gap-2 sm:gap-3'
        disabled={disabled}
        id={fieldId}
        length={length}
        onValueChange={onValueChange}
        style={{
          gridTemplateColumns: `repeat(${length}, minmax(2.75rem, 1fr))`,
        }}
        value={value}
      >
        {Array.from({ length }, (_, index) => (
          <OTPField.Input
            aria-label={index === 0 ? undefined : `Digit ${index + 1} of ${length}`}
            className={cellClass}
            key={index}
          />
        ))}
      </OTPField.Root>
    </div>
  )
}
