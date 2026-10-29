/**
 * Invalidate outstanding password email tokens for a user (reset / set-password).
 *
 * Better Auth may store identifiers as plain `reset-password:<token>` / `set-password:<token>`
 * or as hashes of those strings (default `verification.storeIdentifier`). Rows are keyed by
 * `value` = user id. Invite rows share value=userId but carry `invitationId` — never delete those.
 * 2FA / trust-device rows keep plain prefixes and are preserved.
 */
export type PasswordTokenAdapter = {
  findMany: (args: {
    model: string
    where: Array<{ field: string; value: string }>
  }) => Promise<Array<{ id?: string; identifier?: string; invitationId?: string | null }>>
  delete: (args: {
    model: string
    where: Array<{ field: string; value: string }>
  }) => Promise<unknown>
}

export type PasswordTokenPrefix = 'reset-password:' | 'set-password:'

const KEEP_PLAIN_PREFIXES = ['2fa-', 'trust-device-'] as const

function shouldDeletePasswordEmailRow(
  row: { identifier?: string; invitationId?: string | null },
  prefix: PasswordTokenPrefix
): boolean {
  if (row.invitationId != null && String(row.invitationId).length > 0) return false
  const id = String(row.identifier ?? '')
  if (!id) return false
  if (KEEP_PLAIN_PREFIXES.some((p) => id.startsWith(p))) return false
  // Legacy / plain override: only the matching password flow.
  if (id.startsWith('reset-password:') || id.startsWith('set-password:')) {
    return id.startsWith(prefix)
  }
  // Hashed identifier (no readable prefix) — password-email rows for this userId.
  // Deleting both reset and set hashed rows on either invalidation is intentional.
  return true
}

export async function invalidatePasswordEmailTokens(
  adapter: PasswordTokenAdapter,
  userId: string,
  prefix: PasswordTokenPrefix
): Promise<number> {
  const uid = String(userId)
  if (!uid) return 0
  const rows = await adapter.findMany({
    model: 'verification',
    where: [{ field: 'value', value: uid }],
  })
  let deleted = 0
  for (const row of rows) {
    if (!row.id) continue
    if (!shouldDeletePasswordEmailRow(row, prefix)) continue
    await adapter.delete({
      model: 'verification',
      where: [{ field: 'id', value: row.id }],
    })
    deleted += 1
  }
  return deleted
}
