import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import type { HostRuntimeDeps } from '#iam/types/config'

type AuthLike = {
  $context: Promise<{
    internalAdapter: {
      findAccounts: (userId: string) => Promise<Array<{ id: string; providerId?: string }>>
      deleteAccount: (accountId: string) => Promise<unknown>
    }
  }>
}

export function createUnlinkGoogleAccount(
  host: HostRuntimeDeps,
  facade: AuthUsersFacade,
  auth: AuthLike
) {
  return async function unlinkGoogleAccount(args: { userId: string }): Promise<{ ok: true }> {
    if (!host.authMethods.google) {
      throw new Error('google disabled')
    }

    const userId = args.userId.trim()
    if (!userId) throw new Error('userId required')

    const hasCredential = Boolean(await facade.findCredentialAccount(userId))
    if (!hasCredential) {
      throw new Error('need password login before unlinking Google')
    }

    const ctx = await auth.$context
    const accounts = await ctx.internalAdapter.findAccounts(userId)
    const google = accounts.find((row) => row.providerId === 'google')
    if (!google) {
      throw new Error('google not linked')
    }

    if (accounts.length <= 1) {
      throw new Error('last login method')
    }

    await runWithInternalOperation({ kind: 'GOOGLE_ACCOUNT_ROLLBACK', userId }, async () => {
      await ctx.internalAdapter.deleteAccount(google.id)
    })

    return { ok: true }
  }
}
