import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { formatAdminURL } from 'payload/shared'
import { isAdminPanelUser } from '#iam/modules/rbac'

/** Redirects guests to login; returns the signed-in admin-panel user. */
export function requireAccountUser({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult
  const { payload, user } = req
  const {
    admin: {
      routes: { login: loginRoute },
    },
    routes: { admin: adminRoute },
  } = payload.config

  if (!user || !isAdminPanelUser(user)) {
    redirect(
      formatAdminURL({
        adminRoute: adminRoute as `/${string}`,
        path: (loginRoute ?? '/login') as `/${string}`,
      })
    )
  }

  return user
}
