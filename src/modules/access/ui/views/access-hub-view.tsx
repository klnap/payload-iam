import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import { readAccessTabPreference } from '#iam/modules/access/services/read-access-tab-preference'
import {
  type AccessTab,
  accessCollectionListPath,
  listSearchParamsWithoutView,
  parseAccessViewParam,
} from '#iam/shared/paths/access-paths'

function resolveView(
  fromUrl: AccessTab | null,
  preferred: AccessTab,
  invitationsEnabled: boolean,
  readable: AccessTab[]
): AccessTab {
  const pick = (tab: AccessTab) => (readable.includes(tab) ? tab : (readable[0] ?? 'users'))

  if (fromUrl === 'invitations' && !invitationsEnabled) return pick(preferred)
  if (fromUrl) return pick(fromUrl)
  if (preferred === 'invitations' && !invitationsEnabled) return pick('users')
  return pick(preferred)
}

function toQueryString(searchParams: Record<string, string | string[] | undefined>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

/** Legacy `/access` → canonical `/collections/:tab`. */
export default async function AccessHubView(props: AdminViewServerProps) {
  const { initPageResult, searchParams } = props
  const { permissions, req } = initPageResult
  const user = req.user
  if (!user) {
    redirect(formatAdminURL({ adminRoute: req.payload.config.routes.admin, path: '/login' }))
  }

  const { payload } = req
  const adminRoute = payload.config.routes.admin
  const invitationsEnabled = payload.config.collections.some((c) => c.slug === 'invitations')
  const readable = (
    ['users', ...(invitationsEnabled ? ['invitations' as const] : []), 'roles'] as AccessTab[]
  ).filter((tab) => permissions?.collections?.[tab]?.read === true)

  if (readable.length === 0) {
    redirect(formatAdminURL({ adminRoute, path: '/' }))
  }

  const fromUrl = parseAccessViewParam(searchParams)
  const preferred = await readAccessTabPreference(payload, user)
  const tab = resolveView(fromUrl, preferred, invitationsEnabled, readable)
  const listSearchParams = listSearchParamsWithoutView(searchParams)
  const path = `${accessCollectionListPath(tab)}${toQueryString(listSearchParams)}`

  redirect(formatAdminURL({ adminRoute, path: path as `/${string}` }))
}
