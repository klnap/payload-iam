import { postIamJson } from '#iam/shared/http/json-fetch'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'

export type RequestAccountPasswordResetResult = { ok: true; kind: 'reset' | 'set' }

export async function requestAccountPasswordReset(): Promise<RequestAccountPasswordResetResult> {
  const data = await postIamJson<{ kind?: 'reset' | 'set' }>(
    IAM_API_PATH.account.link.passwordReset,
    {}
  )
  return { ok: true, kind: data.kind === 'set' ? 'set' : 'reset' }
}
