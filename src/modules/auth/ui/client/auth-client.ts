'use client'

import { twoFactorClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { IAM_AUTH_API_BASE_PATH } from '#iam/shared/paths/auth-api-path'

type RbacAuthClient = ReturnType<
  typeof createAuthClient<{
    plugins: [ReturnType<typeof twoFactorClient>]
  }>
>

let client: RbacAuthClient | null = null

/** Browser-only Better Auth client for admin login (basePath matches compose-auth-options). */
export function getIamAuthClient(): RbacAuthClient {
  if (!client) {
    client = createAuthClient({
      baseURL: window.location.origin,
      basePath: IAM_AUTH_API_BASE_PATH,
      plugins: [
        twoFactorClient({
          // Stay on login form — OTP UI is inline, not a separate route.
          onTwoFactorRedirect: () => undefined,
        }),
      ],
    })
  }
  return client
}
