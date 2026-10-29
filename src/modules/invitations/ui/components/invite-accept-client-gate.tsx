'use client'

import { useEffect, useState } from 'react'
import { readStoredInviteSession } from '#iam/modules/invitations/ui/hooks/invite-accept-token-storage'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'
import { GuestPage } from '#iam/shared/ui/guest/guest-page'
import InviteAcceptForm, { type InviteAcceptFormProps } from './invite-accept-form'

const INVALID_COPY = 'This invite link is invalid or expired.'

export function InviteAcceptInvalidPanel() {
  const { t } = useIamTranslation()
  return (
    <GuestPage>
      <GuestPage.Header>
        <GuestPage.Title>{t('iam:rbac:adminViewTitleInviteAccept')}</GuestPage.Title>
        <GuestPage.Description role='alert'>{INVALID_COPY}</GuestPage.Description>
      </GuestPage.Header>
    </GuestPage>
  )
}

type GateProps = Omit<InviteAcceptFormProps, 'token' | 'email' | 'invitationId'>

/** Resume accept after URL cleanup — invitation id + token only in sessionStorage. */
export default function InviteAcceptClientGate(props: GateProps) {
  const [session, setSession] = useState<ReturnType<typeof readStoredInviteSession>>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSession(readStoredInviteSession())
    setReady(true)
  }, [])

  if (!ready) return null
  if (!session?.token) return <InviteAcceptInvalidPanel />

  return (
    <InviteAcceptForm
      {...props}
      email={session.email}
      invitationId={session.invitationId}
      token={session.token}
    />
  )
}
