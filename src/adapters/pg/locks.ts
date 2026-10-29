import type { AdvisoryLock } from '#iam/types/config'

const KIND_ORDER: Record<AdvisoryLock['kind'], number> = {
  EMAIL_PROVISION_GUARD: 0,
  USER_LIFECYCLE_GUARD: 1,
  AUTHZ_ROOT_GUARD: 2,
  ROLE_GUARD: 3,
}

/** Canonical order: EMAIL → USER → ROOT → ROLE(sorted). Dedupes identical locks. */
export function orderAdvisoryLocks(locks: readonly AdvisoryLock[]): AdvisoryLock[] {
  const seen = new Set<string>()
  const unique: AdvisoryLock[] = []
  for (const lock of locks) {
    const key =
      lock.kind === 'ROLE_GUARD'
        ? `ROLE:${lock.roleId}`
        : lock.kind === 'EMAIL_PROVISION_GUARD'
          ? `EMAIL:${lock.email}`
          : lock.kind === 'USER_LIFECYCLE_GUARD'
            ? `USER:${lock.userId}`
            : 'ROOT'
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(lock)
  }
  return [...unique].sort((a: AdvisoryLock, b: AdvisoryLock) => {
    const ka = KIND_ORDER[a.kind]
    const kb = KIND_ORDER[b.kind]
    if (ka !== kb) return ka - kb
    if (a.kind === 'ROLE_GUARD' && b.kind === 'ROLE_GUARD') {
      return a.roleId.localeCompare(b.roleId)
    }
    if (a.kind === 'EMAIL_PROVISION_GUARD' && b.kind === 'EMAIL_PROVISION_GUARD') {
      return a.email.localeCompare(b.email)
    }
    if (a.kind === 'USER_LIFECYCLE_GUARD' && b.kind === 'USER_LIFECYCLE_GUARD') {
      return a.userId.localeCompare(b.userId)
    }
    return 0
  })
}
