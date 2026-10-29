import { postIamJson } from '#iam/shared/http/json-fetch'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'

export async function transferRootToUser(args: { userId: string }): Promise<{ ok: true }> {
  await postIamJson(IAM_API_PATH.users.transferRoot, { userId: args.userId })
  return { ok: true }
}
