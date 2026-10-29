import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'
import type { ReactNode } from 'react'

function isAccountSubRoute(params: AdminViewServerProps['params']): boolean {
  const segments = Array.isArray(params?.segments) ? params.segments : []
  return segments[0] === 'account' && segments.length > 1
}

type Props = AdminViewServerProps & {
  children: ReactNode
}

/**
 * `/account` is wrapped by RootPage `DefaultTemplate`; `/account/sessions` and
 * `/account/security` are custom views without that shell — add it here only.
 */
export function AccountAdminTemplate({ children, initPageResult, params }: Props) {
  if (!isAccountSubRoute(params)) {
    return children
  }

  const { locale, permissions, req, visibleEntities } = initPageResult
  const { i18n, payload, user } = req

  return (
    <DefaultTemplate
      className='account'
      i18n={i18n}
      locale={locale}
      payload={payload}
      permissions={permissions}
      req={req}
      user={user ?? undefined}
      viewActions={payload.config.admin?.components?.actions}
      viewType='account'
      visibleEntities={{
        collections: visibleEntities?.collections,
        globals: visibleEntities?.globals,
      }}
    >
      {children}
    </DefaultTemplate>
  )
}
