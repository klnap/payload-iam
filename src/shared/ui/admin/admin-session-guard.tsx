'use client'

import { useAuth, useConfig } from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation'
import { formatAdminURL } from 'payload/shared'
import { useEffect } from 'react'
import { canUseAdminShell } from '#iam/modules/rbac/access/admin-panel-user'
import { isPublicAdminAuthPath } from '#iam/shared/paths/admin-auth-paths'

/** Redirects away from the admin shell when session is missing or not BA-verified (OAuth abort race). */
export default function AdminSessionGuard() {
  const { permissions, user } = useAuth()
  const { config } = useConfig()
  const pathname = usePathname()
  const router = useRouter()
  const adminRoute = config.routes.admin

  useEffect(() => {
    const loginPath = formatAdminURL({
      adminRoute,
      path: config.admin.routes.login ?? '/login',
    })

    if (isPublicAdminAuthPath(pathname, adminRoute)) return
    // Auth providers hydrate `user` / `permissions` asynchronously. Do not bounce to
    // login while either is still unset — that caused edit-view ↔ /login loops when
    // `/me` briefly lacked email and permissions had not landed yet.
    if (user === undefined || permissions === undefined) return
    if (canUseAdminShell(user, permissions)) return

    const redirectTo = pathname ? `?redirect=${encodeURIComponent(pathname)}` : ''
    router.replace(`${loginPath}${redirectTo}`)
  }, [adminRoute, config.admin.routes.login, pathname, permissions, router, user])

  return null
}
