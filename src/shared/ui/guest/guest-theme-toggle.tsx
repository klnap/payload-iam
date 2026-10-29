'use client'

import { Button } from '@base-ui/react/button'
import { useTheme } from '@payloadcms/ui'
import { useCallback, useRef, useState } from 'react'
import { cx } from 'tailwind-variants'
import { GuestThemeIcon } from './guest-theme-icon'
import { useGuestPageTheme } from './use-guest-page-theme'

/** Fixed top-right theme control on guest routes outside the Payload admin shell. */
export default function GuestThemeToggle() {
  const { setTheme } = useTheme()
  const resolved = useGuestPageTheme()
  const [rotation, setRotation] = useState(0)
  const rotationRef = useRef(0)

  const toggle = useCallback(() => {
    if (resolved === 'dark') {
      setTheme('light')
      rotationRef.current -= 180
    } else {
      setTheme('dark')
      rotationRef.current += 180
    }
    setRotation(rotationRef.current)
  }, [resolved, setTheme])

  const label = resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <Button
      aria-label={label}
      className={cx(
        'fixed top-5 right-5 z-50 flex size-12 cursor-pointer items-center justify-center',
        'rounded-[var(--style-radius-m,6px)] border border-[var(--theme-elevation-150)]',
        'bg-[var(--theme-elevation-50)] text-[1.375rem] text-[var(--theme-text)]',
        'hover:bg-[var(--theme-elevation-100)]'
      )}
      onClick={toggle}
      title={label}
      type='button'
    >
      <span
        className='flex items-center justify-center transition-transform duration-300 ease-in-out'
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <GuestThemeIcon className='block size-[1em]' />
      </span>
    </Button>
  )
}
