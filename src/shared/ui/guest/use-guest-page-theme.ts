'use client'

import { useTheme } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

/** Light/dark on guest routes (Payload theme + system preference when auto). */
export function useGuestPageTheme(): 'light' | 'dark' {
  const { theme, autoMode } = useTheme()
  const [prefersDark, setPrefersDark] = useState(false)

  useEffect(() => {
    if (!autoMode) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setPrefersDark(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [autoMode])

  if (autoMode) return prefersDark ? 'dark' : 'light'
  return theme === 'dark' ? 'dark' : 'light'
}
