import { normalizeEmail } from '#iam/adapters/email/email'
import type { AuthUsersFacade } from './auth-users'

/**
 * Ensure Better Auth has a user row for this Payload user id.
 * Stock/localized Payload deletes often leave BA orphans under a different id —
 * reclaim the email before create so invite/accept do not fail on unique email.
 */
export async function ensureBaUserMatchesPayload(
  facade: AuthUsersFacade,
  args: { userId: string; email: string; name: string }
): Promise<void> {
  const userId = String(args.userId)
  const email = normalizeEmail(args.email)
  const byId = await facade.findUserById(userId).catch(() => null)
  if (byId) return

  const byEmail = await facade.findUserByEmail(email).catch(() => null)
  if (byEmail?.id && String(byEmail.id) !== userId) {
    try {
      await facade.deleteUser(String(byEmail.id))
    } catch {
      throw new Error(
        `cannot reclaim Better Auth email (${email}); delete the stale auth user first`
      )
    }
  }

  await facade.createUser({
    id: userId,
    email,
    name: args.name.trim() || email,
  })
}

/** Delete BA by Payload user id, then any leftover BA row for the same email. */
export async function deleteBaUserPreferIdThenEmail(
  facade: AuthUsersFacade,
  args: { userId: string; email?: string | null }
): Promise<void> {
  const userId = String(args.userId)
  try {
    await facade.deleteUser(userId)
  } catch {
    // already gone
  }
  const email = args.email ? normalizeEmail(String(args.email)) : ''
  if (!email) return
  try {
    const byEmail = await facade.findUserByEmail(email)
    if (byEmail?.id && String(byEmail.id) !== userId) {
      await facade.deleteUser(String(byEmail.id))
    }
  } catch {
    // ignore
  }
}
