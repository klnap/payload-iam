import type { PgPool } from './pg-host'

/** One query per admin roles list — `users_rels` path `roles`. */
export async function loadRoleUserCountsCache(pool: PgPool): Promise<Map<string, number>> {
  const { rows } = await pool.query(
    `SELECT "roles_id"::text AS role_id, COUNT(*)::int AS n
     FROM "users_rels"
     WHERE "path" = 'roles' AND "roles_id" IS NOT NULL
     GROUP BY "roles_id"`
  )
  const map = new Map<string, number>()
  for (const row of rows) {
    const id = row.role_id
    if (id != null) map.set(String(id), Number(row.n ?? 0))
  }
  return map
}
