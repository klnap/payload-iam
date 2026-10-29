'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { storeInviteSession } from '#iam/modules/invitations/ui/hooks/invite-accept-token-storage'

type Props = {
  invitationId: string
  token: string
  email: string
}

/** Move invite secret from URL to sessionStorage; URL becomes bare `/invite/accept`. */
export default function InviteAcceptUrlCleanup({ invitationId, token, email }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    if (!token || !invitationId) return
    ran.current = true
    storeInviteSession({ invitationId, token, email })
    router.replace(pathname, { scroll: false })
  }, [email, invitationId, pathname, router, token])

  return null
}
