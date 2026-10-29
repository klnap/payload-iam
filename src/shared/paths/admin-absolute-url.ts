/** Path under `serverURL` for an admin view segment (Payload `routes.admin` + relative path). */
export function adminAbsolutePath(adminRoute: string, segment: string): string {
  const base = (adminRoute || '/').replace(/\/$/, '')
  const seg = segment.startsWith('/') ? segment : `/${segment}`
  if (base === '') return seg
  return `${base}${seg}`
}

export function adminAbsoluteUrl(serverURL: string, adminRoute: string, segment: string): string {
  const origin = serverURL.replace(/\/$/, '')
  return `${origin}${adminAbsolutePath(adminRoute, segment)}`
}

export function readPayloadAdminRoute(adminRoute: string | undefined): string {
  return adminRoute ?? '/admin'
}

/** Prefix relative public asset paths with `serverURL`; leave absolute URLs unchanged. */
export function absolutizePublicUrl(serverURL: string, src: string): string {
  if (/^https?:\/\//i.test(src)) return src
  const origin = serverURL.replace(/\/$/, '')
  const path = src.startsWith('/') ? src : `/${src}`
  return `${origin}${path}`
}
