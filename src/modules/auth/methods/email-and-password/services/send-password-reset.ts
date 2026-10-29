import { generateId } from '@better-auth/core/utils/id'
import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import type { Actor, HostRuntimeDeps } from '#iam/types/config'
import { invalidatePasswordEmailTokens } from './invalidate-password-email-tokens'
import {
  adminPasswordTokenPageUrl,
  loadActiveUserForPasswordEmail,
  userHasCredentialAccount,
} from './password-email-user'

type AuthContext = {
  internalAdapter: {
    findAccounts: (userId: string) => Promise<Array<{ providerId?: string }>>
    createVerificationValue: (args: {
      value: string
      identifier: string
      expiresAt: Date
    }) => Promise<unknown>
  }
  adapter: {
    findMany: (args: {
      model: string
      where: Array<{ field: string; value: string }>
    }) => Promise<Array<{ id?: string; identifier?: string }>>
    delete: (args: {
      model: string
      where: Array<{ field: string; value: string }>
    }) => Promise<unknown>
  }
  options: {
    emailAndPassword?: {
      resetPasswordTokenExpiresIn?: number
    }
  }
}

type AuthLike = {
  $context: Promise<AuthContext>
}

export function createSendPasswordReset(
  host: HostRuntimeDeps,
  facade: AuthUsersFacade,
  auth: AuthLike
) {
  return async function sendPasswordReset(args: {
    userId: string
    actor: Actor
    redirectTo?: string
  }): Promise<{ ok: true }> {
    if (!host.authMethods.forgotPassword) {
      throw new Error('forgot password disabled')
    }

    const user = await loadActiveUserForPasswordEmail(host, args.userId)

    if (!(await userHasCredentialAccount(facade, auth, args.userId))) {
      throw new Error('no credential')
    }

    const resetRedirect = args.redirectTo ?? adminPasswordTokenPageUrl(host, 'reset')
    const defaultExpiresInSec = 3600

    await runWithInternalOperation({ kind: 'GENERIC_RESET', userId: args.userId }, async () => {
      const ctx = await auth.$context
      const tokenExpiresIn =
        ctx.options.emailAndPassword?.resetPasswordTokenExpiresIn ?? defaultExpiresInSec
      const expiresAt = new Date(Date.now() + tokenExpiresIn * 1000)
      const verificationToken = generateId(24)

      // One live reset token per user — prevents inbox/old-link account takeover races.
      await invalidatePasswordEmailTokens(ctx.adapter, args.userId, 'reset-password:')

      await ctx.internalAdapter.createVerificationValue({
        value: args.userId,
        identifier: `reset-password:${verificationToken}`,
        expiresAt,
      })

      const resetUrl = `${resetRedirect}#token=${encodeURIComponent(verificationToken)}`
      await host.sendResetEmail({
        to: user.email,
        resetUrl,
        expiresAt,
      })
    })

    host.onAudit?.({
      type: 'password_reset_requested',
      userId: args.userId,
      actor: args.actor,
      channel: args.actor.type === 'system' ? 'self_service' : 'admin',
    })

    return { ok: true }
  }
}
