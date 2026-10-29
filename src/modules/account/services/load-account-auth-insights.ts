import type { Payload } from 'payload'
import { loadUserAuthAccountInsights } from '#iam/modules/users'
import type { UserAuthAccountInsights } from '#iam/modules/users/domain/user-auth-account-insights'
import { getPrivateAuth } from '#iam/plugin/runtime/create-runtime'
import { readIamSurface } from '#iam/plugin/runtime/payload-iam-surface'

function emptyInsights(googleLoginEnabled: boolean): UserAuthAccountInsights {
  return {
    hasPassword: false,
    hasGoogle: false,
    googleLoginEnabled,
    lastLoginAt: null,
  }
}

/** Account views — same data as users `authAccountInsights` afterRead (no `api` indirection). */
export async function loadAccountAuthInsights(
  payload: Payload,
  userId: string,
  googleLoginEnabled: boolean
): Promise<UserAuthAccountInsights> {
  const surface = readIamSurface(payload)
  if (!surface) return emptyInsights(googleLoginEnabled)

  const apiInsights = surface.api.getUserAuthAccountInsights
  if (typeof apiInsights === 'function') {
    return apiInsights({ userId })
  }

  try {
    return await loadUserAuthAccountInsights({
      payload,
      userId,
      googleLoginEnabled,
      getAuth: getPrivateAuth,
    })
  } catch {
    const hasPassword = await surface.api.userHasPasswordLogin({ userId })
    return { ...emptyInsights(googleLoginEnabled), hasPassword }
  }
}
