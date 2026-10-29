'use client'

import { HttpJsonError, postIamJson } from '#iam/shared/http/json-fetch'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'

/** Shared invite resend API. */
export async function resendInvite(args: {
  invitationId: string
  sendEmail: boolean
}): Promise<{ invitationId: string; inviteUrl: string; expiresAt: string }> {
  try {
    const body = await postIamJson<{
      invitationId?: string
      inviteUrl?: string
      expiresAt?: string
    }>(IAM_API_PATH.invitations.resend, args)
    if (!body.inviteUrl || !body.invitationId) {
      throw new Error('Invalid response')
    }
    return {
      invitationId: body.invitationId,
      inviteUrl: body.inviteUrl,
      expiresAt: body.expiresAt ? String(body.expiresAt) : '',
    }
  } catch (err) {
    if (err instanceof HttpJsonError) throw err
    throw err instanceof Error ? err : new Error('Request failed')
  }
}
