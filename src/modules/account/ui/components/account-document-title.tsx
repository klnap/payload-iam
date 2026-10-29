'use client'

import { useConfig } from '@payloadcms/ui'
import { useEffect } from 'react'

type Props = {
  title: string
}

/** Browser tab title — custom view metadata cannot use `i18n()` LabelFunctions. */
export default function AccountDocumentTitle({ title }: Props) {
  const { config } = useConfig()
  const suffix = config.admin?.meta?.titleSuffix?.trim()

  useEffect(() => {
    const base = title.trim()
    document.title = suffix ? `${base} ${suffix}` : base
  }, [title, suffix])

  return null
}
