'use client'

import {
  Button,
  LoadingOverlayToggle,
  toast,
  useDocumentInfo,
  useField,
  useFormFields,
} from '@payloadcms/ui'
import { useState } from 'react'
import { resendInvite } from '#iam/modules/invitations/ui/drawer/invite-api'
import { tIam } from '#iam/shared/i18n/t-iam'
import { useIamTranslation } from '#iam/shared/i18n/use-iam-t'

/** Sidebar — Renew only when expired (not pending). */
export default function InvitationRenewField() {
  const { t } = useIamTranslation()
  const { id } = useDocumentInfo()
  const status = useFormFields(([fields]) =>
    fields.status?.value != null ? String(fields.status.value) : ''
  )
  const { setValue: setInviteLink } = useField<string>({ path: 'inviteLink' })
  const { setValue: setExpiresAt } = useField<string>({ path: 'expiresAt' })
  const { setValue: setStatus } = useField<string>({ path: 'status' })
  const invitationId = id != null ? String(id) : ''
  const expired = status === 'expired'
  const [busy, setBusy] = useState(false)

  if (!expired) return null

  const onRenew = async () => {
    if (!invitationId || busy) return
    setBusy(true)
    try {
      const result = await resendInvite({
        invitationId,
        sendEmail: true,
      })
      // Never put accept token into form state (would look like persistence; copy from API toast/email only).
      try {
        const u = new URL(result.inviteUrl)
        u.searchParams.delete('token')
        setInviteLink(u.toString(), true)
      } catch {
        setInviteLink(result.inviteUrl.replace(/([?&])token=[^&]*/g, '').replace(/\?$/, ''), true)
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(result.inviteUrl).catch(() => {})
      }
      if (result.expiresAt) setExpiresAt(result.expiresAt, true)
      setStatus('pending', true)
      toast.success(tIam(t, 'iam:rbac:inviteRenewSuccess'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tIam(t, 'iam:rbac:inviteRenewFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='field-type mt-20 [&_.btn]:m-0 [&_.btn]:w-full'>
      <LoadingOverlayToggle
        loadingText={tIam(t, 'iam:rbac:inviteRenewingOverlay')}
        name='iam-invite-renew'
        show={busy}
      />
      <Button
        buttonStyle='primary'
        disabled={busy || !invitationId}
        onClick={() => void onRenew()}
        type='button'
      >
        {busy ? tIam(t, 'iam:rbac:inviteRenewing') : tIam(t, 'iam:rbac:inviteRenewButton')}
      </Button>
    </div>
  )
}
