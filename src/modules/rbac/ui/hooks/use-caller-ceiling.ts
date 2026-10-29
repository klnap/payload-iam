'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect, useMemo, useState } from 'react'
import { ROOT_ROLE_NAME } from '#iam/core/rbac/is-root-role'
import {
  effectiveIsRoot,
  effectivePermissions,
  type RolePermissions,
} from '#iam/modules/rbac/access/can'

export function roleLabelsIndicateRoot(user: Record<string, unknown> | null | undefined): boolean {
  const labels = user?.roleLabels
  if (typeof labels !== 'string' || !labels.trim()) return false
  return labels
    .split(',')
    .map((s) => s.trim())
    .includes(ROOT_ROLE_NAME)
}

function ceilingFromUserAndPermissions(
  user: Record<string, unknown>,
  permissions:
    | { collections?: Record<string, { update?: boolean; create?: boolean }> }
    | null
    | undefined
): RolePermissions | 'root' | null {
  if (effectiveIsRoot(user as never)) return 'root'
  if (user.iamIsRoot === true) return 'root'
  if (roleLabelsIndicateRoot(user)) return 'root'
  const rolesAccess = permissions?.collections?.roles
  if (rolesAccess?.update === true && rolesAccess?.create === true) return 'root'
  return effectivePermissions(user as never)
}

/** Caller's permission ceiling for matrix UI — `root` = unrestricted. */
export function useCallerCeiling(): RolePermissions | 'root' | null {
  const { permissions, user } = useAuth()
  const [meRoot, setMeRoot] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/users/me?depth=0', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { user?: Record<string, unknown> } | null) => {
        if (cancelled || !json?.user) return
        const u = json.user
        if (u.iamIsRoot === true || roleLabelsIndicateRoot(u) || effectiveIsRoot(u as never)) {
          setMeRoot(true)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const ceilingFromAuth = useMemo(() => {
    if (!user) return null
    return ceilingFromUserAndPermissions(user as Record<string, unknown>, permissions)
  }, [permissions, user])

  if (!user) return null
  if (meRoot || ceilingFromAuth === 'root') return 'root'
  return ceilingFromAuth
}
