import { postIamAuthJson } from '#iam/shared/http/json-fetch'
import { IAM_AUTH_ROUTES } from '#iam/shared/paths/auth-routes'

/** Better Auth session sign-out; safe when already logged out. */
export async function runIamSignOut(): Promise<void> {
  try {
    await postIamAuthJson(IAM_AUTH_ROUTES.session.signOut, {})
  } catch {
    // still clear client auth state
  }
}
