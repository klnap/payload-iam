import { postIamAuthJson } from '#iam/shared/http/json-fetch'
import { IAM_AUTH_ROUTES } from '#iam/shared/paths/auth-routes'

export async function sendLoginOtp(): Promise<boolean> {
  try {
    await postIamAuthJson(IAM_AUTH_ROUTES.emailAndPassword.loginOtp.send, {})
    return true
  } catch {
    return false
  }
}

export async function verifyLoginOtp(code: string): Promise<boolean> {
  try {
    await postIamAuthJson(IAM_AUTH_ROUTES.emailAndPassword.loginOtp.verify, { code })
    return true
  } catch {
    return false
  }
}
