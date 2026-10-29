import { postIamJson } from '#iam/shared/http/json-fetch'
import { IAM_API_PATH } from '#iam/shared/paths/iam-api-paths'

export async function unlinkGoogleAccount(): Promise<void> {
  await postIamJson(IAM_API_PATH.account.unlink.google, {})
}
