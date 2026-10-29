import { postIamJson } from '#iam/shared/http/json-fetch'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'

export async function changeAccountPassword(args: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  await postIamJson(IAM_API_PATH.account.changePassword, args)
}
