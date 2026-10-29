import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { normalizeEmail } from '#iam/adapters/email/email'
import type { HostRuntimeDeps, IamApi } from '#iam/types/config'
import { findActiveUserIdByEmail, userHasCredentialAccount } from './password-email-user'

type AuthLike = {
  $context: Promise<{
    internalAdapter: {
      findAccounts: (userId: string) => Promise<Array<{ providerId?: string }>>
    }
  }>
}

export function createRequestPasswordEmail(
  host: HostRuntimeDeps,
  facade: AuthUsersFacade,
  auth: AuthLike,
  deps: {
    sendPasswordReset: IamApi['sendPasswordReset']
    sendSetPassword: IamApi['sendSetPassword']
  }
) {
  return async function requestPasswordEmail(args: { email: string }) {
    if (!host.authMethods.forgotPassword) {
      throw new Error('forgot password disabled')
    }

    const email = normalizeEmail(args.email.trim())
    if (!email) return { ok: true as const }

    const userId = await findActiveUserIdByEmail(host, email)
    if (!userId) return { ok: true as const }

    const actor = { type: 'system' as const, reason: 'password_email_request' }
    if (await userHasCredentialAccount(facade, auth, userId)) {
      await deps.sendPasswordReset({ userId, actor })
    } else {
      await deps.sendSetPassword({ userId, actor })
    }

    return { ok: true as const }
  }
}
