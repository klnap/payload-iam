'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import type { SessionView } from '#iam/modules/sessions/domain/session-view'
import SessionsPanel from '#iam/modules/sessions/ui/components/sessions-panel'

function readSessions(raw: unknown): SessionView[] {
  if (!Array.isArray(raw)) return []
  return raw as SessionView[]
}

/** Users edit — sessions from server afterRead (no client fetch). */
export default function UserSessionsField() {
  const { id, docPermissions } = useDocumentInfo()
  const userId = id != null ? String(id) : ''
  const canRead = Boolean(docPermissions?.read)
  const canRevoke = Boolean(docPermissions?.update)
  const sessions = useFormFields(([fields]) => readSessions(fields.adminUserSessions?.value))

  if (!userId || !canRead) return null

  return (
    <div className='field-type'>
      <SessionsPanel canRevoke={canRevoke} compact sessions={sessions} targetUserId={userId} />
    </div>
  )
}
