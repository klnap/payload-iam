'use client'

import { useFormModified } from '@payloadcms/ui'
import { useEffect, useRef, useState } from 'react'

let sessionPerms: Record<string, unknown> | null = null
let sessionDirty = false

/**
 * Local UI session + form sync.
 *
 * Deferred setValue-until-submit broke Save — SaveButton is type="button" and
 * calls form.submit(), so native `submit` never fired. Always setValue on toggle.
 */
export function useLocalPermissionsUntilSave(
  value: unknown,
  setValue: (v: unknown, disableModifyingForm?: boolean) => void
) {
  const modified = useFormModified()
  const empty = { collections: {}, globals: {} }
  const fromProps = value && typeof value === 'object' ? (value as Record<string, unknown>) : empty

  const [local, setLocal] = useState(() => sessionPerms ?? fromProps)
  const wasModified = useRef(modified)

  useEffect(() => {
    if (wasModified.current && !modified) {
      sessionDirty = false
      sessionPerms = null
    }
    wasModified.current = modified
  }, [modified])

  const valueKey = JSON.stringify(value ?? null)
  const prevKey = useRef(valueKey)
  useEffect(() => {
    if (sessionDirty) return
    if (valueKey === prevKey.current) return
    prevKey.current = valueKey
    if (value && typeof value === 'object') {
      setLocal(value as Record<string, unknown>)
    }
  }, [valueKey, value])

  const patch = (next: Record<string, unknown>) => {
    sessionPerms = next
    sessionDirty = true
    setLocal(next)
    setValue(next)
  }

  return [local, patch] as const
}
