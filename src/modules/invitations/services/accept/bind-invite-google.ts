import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { buildInviteGoogleSetCookieHeader } from '#iam/adapters/better-auth/methods/google/invite-google-cookie'
import { newId } from '#iam/core/identity/ids'
import type { HostRuntimeDeps } from '#iam/types/config'
import { validateInviteAcceptPrelude } from './invite-accept-prelude'

export function createBindInviteGoogle(
  host: HostRuntimeDeps,
  auth: {
    $context: Promise<{
      internalAdapter: {
        findVerificationValue: (
          id: string
        ) => Promise<{ value: string; invitationId?: string } | null>
      }
    }>
  },
  secret: string,
  facade: AuthUsersFacade
) {
  return async function bindInviteGoogle(args: {
    invitationId: string
    token: string
  }): Promise<{ ok: true; setCookie: string } | { error: string }> {
    const validated = await validateInviteAcceptPrelude(host, auth, args)
    if ('error' in validated) return { error: validated.error }

    const { prelude } = validated
    const userId = prelude.userId ?? newId()

    // Google has disableSignUp — BA user must exist with Payload id before OAuth.
    try {
      const { ensureBaUserMatchesPayload } = await import(
        '#iam/adapters/better-auth/ensure-ba-user'
      )
      await ensureBaUserMatchesPayload(facade, {
        userId,
        email: prelude.email,
        name: prelude.fullName || prelude.email,
      })
    } catch {
      return { error: 'credential_failed' }
    }

    const provisioningOperationId = newId()
    const setCookie = buildInviteGoogleSetCookieHeader(secret, {
      invitationId: prelude.invitationId,
      userId,
      token: args.token,
      email: prelude.email,
      provisioningOperationId,
    })

    return { ok: true, setCookie }
  }
}
