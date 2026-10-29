import type { AdminViewServerProps } from 'payload'
import LogoutClient from '#iam/modules/auth/ui/components/logout-client'
import GuestLayout from '#iam/shared/ui/guest/guest-layout'

const baseClass = 'logout'

/** Replaces Payload stock logout — Better Auth sign-out, then clear client auth state. */
export default function LogoutView({ initPageResult, searchParams }: AdminViewServerProps) {
  const adminRoute = initPageResult.req.payload.config.routes.admin || '/'
  const raw = searchParams?.redirect
  const redirect = Array.isArray(raw) ? raw[0] : raw

  return (
    <GuestLayout>
      <div className={baseClass}>
        <LogoutClient adminRoute={adminRoute} redirect={redirect} />
      </div>
    </GuestLayout>
  )
}

export function LogoutInactivity(props: AdminViewServerProps) {
  const adminRoute = props.initPageResult.req.payload.config.routes.admin || '/'
  const raw = props.searchParams?.redirect
  const redirect = Array.isArray(raw) ? raw[0] : raw

  return (
    <GuestLayout>
      <div className={baseClass}>
        <LogoutClient adminRoute={adminRoute} inactivity redirect={redirect} />
      </div>
    </GuestLayout>
  )
}
