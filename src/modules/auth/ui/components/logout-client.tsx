'use client'

import {
  Button,
  LoadingOverlay,
  toast,
  useAuth,
  useConfig,
  useRouteTransition,
  useTranslation,
} from '@payloadcms/ui'
import { useRouter } from 'next/navigation.js'
import { formatAdminURL } from 'payload/shared'
import { useEffect, useRef } from 'react'
import { runIamSignOut } from '#iam/shared/auth/run-iam-sign-out'

const baseClass = 'logout'

type Props = {
  adminRoute: string
  inactivity?: boolean
  redirect?: string | string[]
}

/** BA sign-out (session cookie), then clear Payload client state — no `/users/logout` (local JWT off). */
export default function LogoutClient({ adminRoute, inactivity, redirect }: Props) {
  const { setUser, user } = useAuth()
  useConfig()
  const { startRouteTransition } = useRouteTransition()
  const { t } = useTranslation()
  const router = useRouter()
  const ran = useRef(false)

  const redirectParam = Array.isArray(redirect) ? redirect[0] : redirect
  const loginRoute = formatAdminURL({
    adminRoute: adminRoute as `/${string}`,
    path: `/login${
      inactivity && redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''
    }` as `/${string}`,
  })

  const isLoggedIn = Boolean(user?.id)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    void (async () => {
      await runIamSignOut()
      setUser(null)

      if (isLoggedIn && !inactivity) {
        toast.success(t('authentication:loggedOutSuccessfully'))
      }

      startRouteTransition(() => router.push(loginRoute))
    })()
  }, [inactivity, isLoggedIn, loginRoute, router, setUser, startRouteTransition, t])

  if (!isLoggedIn && inactivity) {
    return (
      <div className={`${baseClass}__wrap`}>
        <h2>{t('authentication:loggedOutInactivity')}</h2>
        <Button buttonStyle='secondary' el='link' size='large' url={loginRoute}>
          {t('authentication:logBackIn')}
        </Button>
      </div>
    )
  }

  return <LoadingOverlay animationDuration='0ms' loadingText={t('authentication:loggingOut')} />
}
