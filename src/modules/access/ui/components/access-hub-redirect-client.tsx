'use client'

import { useConfig } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { useEffect, useRef } from 'react'
import { type AccessTab, accessCollectionListPath } from '#iam/shared/paths/access-paths'

type Props = {
  tab: AccessTab
}

/** Legacy `/access` without `view` — client replace to `/collections/:tab`. */
export default function AccessHubRedirectClient({ tab }: Props) {
  const router = useRouter()
  const { config } = useConfig()
  const didRedirect = useRef(false)

  useEffect(() => {
    if (didRedirect.current) return
    didRedirect.current = true
    const adminRoute = config?.routes?.admin ?? '/admin'
    router.replace(
      formatAdminURL({
        adminRoute,
        path: accessCollectionListPath(tab),
      })
    )
  }, [config, router, tab])

  return null
}
