import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { isStrongPassword, passwordPolicyMessage } from '#iam/core/identity/password-policy'
import type { HostRuntimeDeps, IamApi } from '#iam/types/config'
import { userHasCredentialAccount } from './password-email-user'

type SetPasswordFn = IamApi['setPassword']

type AuthContext = {
  internalAdapter: {
    findVerificationValue: (
      identifier: string
    ) => Promise<{ value: string; expiresAt?: Date | string } | null>
    deleteVerificationByIdentifier: (identifier: string) => Promise<unknown>
    findAccounts: (userId: string) => Promise<Array<{ providerId?: string }>>
  }
}

type AuthLike = {
  $context: Promise<AuthContext>
}

function verificationExpired(expiresAt: Date | string | undefined): boolean {
  if (!expiresAt) return false
  const ms = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime()
  return Number.isFinite(ms) && ms < Date.now()
}

export function createCompleteSetPassword(
  host: HostRuntimeDeps,
  facade: AuthUsersFacade,
  auth: AuthLike,
  setPassword: SetPasswordFn
) {
  return async function completeSetPassword(args: { token: string; password: string }) {
    if (!host.authMethods.forgotPassword) {
      throw new Error('forgot password disabled')
    }

    const token = args.token.trim()
    if (!token) throw new Error('invalid token')

    const identifier = `set-password:${token}`
    const ctx = await auth.$context
    const verification = await ctx.internalAdapter.findVerificationValue(identifier)
    if (!verification?.value) throw new Error('invalid token')
    if (verificationExpired(verification.expiresAt)) throw new Error('invalid token')

    const userId = String(verification.value)
    if (await userHasCredentialAccount(facade, auth, userId)) {
      throw new Error('credential already exists')
    }
    // Validate before consuming the one-time token (hashed identifier in DB).
    if (!isStrongPassword(args.password)) {
      throw new Error(passwordPolicyMessage())
    }

    await runWithInternalOperation({ kind: 'SET_PASSWORD_EMAIL', userId }, async () => {
      // Prefer BA helper so storeIdentifier hashing is applied (raw adapter lookup by plain id misses).
      await ctx.internalAdapter.deleteVerificationByIdentifier(identifier)
      await setPassword({ userId, password: args.password })
    })

    host.onAudit?.({
      type: 'set_password_completed',
      userId,
      actor: { type: 'system', reason: 'set_password_email' },
    })

    return { status: true }
  }
}
