/** Payload entity with optional `versions.drafts` (collections + globals). */
export type DraftsConfigSource = {
  versions?: boolean | { drafts?: boolean | Record<string, unknown> | null }
}

/** True when drafts are enabled — Publish UI + IAM `publish` grant apply. */
export function hasDraftsEnabled(entity: DraftsConfigSource): boolean {
  const versions = entity.versions
  if (!versions || versions === true) return false
  const drafts = versions.drafts
  return drafts != null && drafts !== false
}
