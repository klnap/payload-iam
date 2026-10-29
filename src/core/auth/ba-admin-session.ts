/** Package-private marker set only by BA strategy — never from HTTP body. */
export const BA_ADMIN_SESSION_CHANNEL = 'ba-admin-session' as const

export type AuthChannel = typeof BA_ADMIN_SESSION_CHANNEL

export function hasBaAdminSession(
  user:
    | {
        authChannel?: string
        type?: string
      }
    | null
    | undefined
): boolean {
  if (!user || user.type === 'service') return false
  return user.authChannel === BA_ADMIN_SESSION_CHANNEL
}
