import { postIamJson } from '#iam/shared/http/json-fetch'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'

export type SendPasswordEmailResult = { ok: true; kind: 'reset' | 'set' }

export async function sendUserPasswordReset(args: {
  userId: string
}): Promise<SendPasswordEmailResult> {
  const data = await postIamJson<{ kind?: 'reset' | 'set' }>(IAM_API_PATH.users.sendPasswordReset, {
    userId: args.userId,
  })
  return { ok: true, kind: data.kind === 'set' ? 'set' : 'reset' }
}
