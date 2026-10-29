import type { FieldHook } from 'payload'
import { extractPool } from '#iam/adapters/pg/pg-host'
import { loadRoleUserCountsCache } from '#iam/adapters/pg/role-user-counts'

const CTX_KEY = 'payloadRbacRoleUserCounts'

export const roleUsersCountAfterRead: FieldHook = async ({ data, req }) => {
  const id = data?.id
  if (id == null) return 0

  const ctx = req.context as Record<string, unknown>
  let cache = ctx[CTX_KEY] as Map<string, number> | undefined
  if (!cache) {
    cache = await loadRoleUserCountsCache(extractPool(req.payload))
    req.context = { ...ctx, [CTX_KEY]: cache }
  }
  return cache.get(String(id)) ?? 0
}
