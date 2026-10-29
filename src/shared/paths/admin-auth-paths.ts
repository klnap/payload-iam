import { IAM_SESSION_ENDED_PATH, IAM_SIGN_OUT_PATH } from './auth-view-paths'

function adminPathRelative(pathname: string | null, adminRoute: string): string | null {
  if (!pathname) return null
  const base = (adminRoute || '/').replace(/\/$/, '') || ''
  const path = pathname.replace(/\/$/, '') || '/'
  if (base === '') {
    return path
  }
  if (path === base) return '/'
  return path.startsWith(`${base}/`) ? path.slice(base.length) : path
}

/** Login route only (bootstrap UI lives here when no Root Admin exists). */
export function isLoginAdminPath(pathname: string | null, adminRoute: string): boolean {
  const rel = adminPathRelative(pathname, adminRoute)
  if (!rel) return false
  return rel === '/login' || rel.startsWith('/login/')
}

/** Admin routes that must render without a verified panel session (login, OAuth return, etc.). */
export function isPublicAdminAuthPath(pathname: string | null, adminRoute: string): boolean {
  const rel = adminPathRelative(pathname, adminRoute)
  if (!rel) return false

  const publicPaths = [
    '/login',
    IAM_SIGN_OUT_PATH,
    IAM_SESSION_ENDED_PATH,
    '/forgot',
    '/reset-password',
    '/set-password',
    '/invite/accept',
  ]

  if (publicPaths.some((p) => rel === p || rel.startsWith(`${p}/`))) return true
  if (rel.startsWith('/reset/')) return true
  return false
}

export { adminPathRelative }
