import type { AuthUsersFacade } from '#iam/adapters/better-auth/auth-users'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { hostPayload } from '#iam/adapters/payload/payload-host'
import { orderAdvisoryLocks } from '#iam/adapters/pg/locks'
import type { HostRuntimeDeps } from '#iam/types/config'

export type ReconcileReport = {
  orphansPayload: string[]
  orphansBa: string[]
  repaired: string[]
  manual: string[]
  fatal: string[]
}

/** Collect-then-process; fail-closed on ambiguity; never remove last root */
export function createReconcile(host: HostRuntimeDeps, facade: AuthUsersFacade) {
  return async function reconcile(): Promise<ReconcileReport> {
    return host.withAdvisoryLocks(orderAdvisoryLocks([{ kind: 'AUTHZ_ROOT_GUARD' }]), async () =>
      runWithInternalOperation({ kind: 'RECONCILE_REPAIR' }, async () => {
        const report: ReconcileReport = {
          orphansPayload: [],
          orphansBa: [],
          repaired: [],
          manual: [],
          fatal: [],
        }
        const payload = await hostPayload(host)
        const users = await payload.find({
          collection: 'users',
          limit: 5000,
          depth: 0,
          overrideAccess: true,
          pagination: false,
        })

        const payloadIds = new Set((users.docs as Array<{ id: string }>).map((u) => String(u.id)))

        for (const id of payloadIds) {
          try {
            const ba = await facade.findUserById(id)
            if (!ba) {
              report.orphansPayload.push(id)
              report.manual.push(`payload-without-ba:${id}`)
            }
          } catch (e) {
            report.fatal.push(`probe-failed:${id}:${String(e)}`)
          }
        }

        return report
      })
    )
  }
}
