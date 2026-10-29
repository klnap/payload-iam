import { postIamJson } from '#iam/shared/http/json-fetch'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'

export async function setAccountPassword(args: { password: string }): Promise<void> {
  await postIamJson(IAM_API_PATH.account.link.password, args)
}
