import type { Payload } from 'payload'
import { normalizeEmail } from '#iam/adapters/email/email'
import { getRegisteredHost } from '#iam/adapters/payload/host-registry'
import { runWithInternalOperation } from '#iam/adapters/payload/operation-als'
import { orderAdvisoryLocks } from '#iam/adapters/pg/locks'
import { resolveProvisionPassword } from '#iam/core/identity/password-policy'
import {
  isRootBootstrapAllowed,
  MISSING_ROOT_PROD_MESSAGE,
} from '#iam/modules/bootstrap/config/bootstrap'
import { resolveUsersSlugFromPayload } from '#iam/plugin/resolve-users-slug'
import { requireIamSurface } from '#iam/plugin/runtime/payload-iam-surface'
import { ensureRootRole } from './ensure-root-role'
import { hasRoot } from './has-root'

export type BootstrapRootInput = {
  email: string
  password?: string
  fullName?: string
}

export type BootstrapRootResult = {
  roleId: string
  userId: string
  generatedPassword?: string
}

/**
 * Create Root role + first user (active, password set, no invite).
 * HTTP path: only when bootstrap allowed.
 * CLI may set PAYLOAD_RBAC_BOOTSTRAP=1 to run under production NODE_ENV.
 */
export async function bootstrapRoot(
  payload: Payload,
  input: BootstrapRootInput
): Promise<BootstrapRootResult> {
  if (!isRootBootstrapAllowed()) {
    throw new Error(MISSING_ROOT_PROD_MESSAGE)
  }

  if (await hasRoot(payload)) {
    throw new Error('Root Admin already exists')
  }

  const email = normalizeEmail(input.email)
  if (!email) {
    throw new Error('email required')
  }
  const { password, generated } = resolveProvisionPassword(input.password)

  const usersSlug = resolveUsersSlugFromPayload(payload)
  const existingUser = await payload.find({
    collection: usersSlug,
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (existingUser.docs.length > 0) {
    throw new Error(
      'A user with this email already exists. Use another email or clean up the existing account.'
    )
  }

  const liveInvite = await payload.find({
    collection: 'invitations',
    where: {
      and: [{ email: { equals: email } }, { status: { equals: 'pending' } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (liveInvite.docs.length > 0) {
    throw new Error(
      'A pending invitation already exists for this email. Revoke it first or use another email.'
    )
  }

  const fullName = input.fullName?.trim() || email.split('@')[0] || 'Root Admin'

  // Serialize concurrent bootstrap (different emails) so only one Root Admin can be minted.
  const host = getRegisteredHost()
  return host.withAdvisoryLocks(orderAdvisoryLocks([{ kind: 'AUTHZ_ROOT_GUARD' }]), async () => {
    if (await hasRoot(payload)) {
      throw new Error('Root Admin already exists')
    }

    return runWithInternalOperation({ kind: 'BOOTSTRAP' }, async () => {
      if (await hasRoot(payload)) {
        throw new Error('Root Admin already exists')
      }

      const role = await ensureRootRole(payload)
      const iam = requireIamSurface(payload)

      const created = await iam.api.createSharedUser({
        email,
        fullName,
        roleIds: [role.id],
        actor: { type: 'system', reason: 'bootstrap-root' },
        skipInvite: true,
      })
      if (!('id' in created)) {
        throw new Error('bootstrap createSharedUser must return user id')
      }
      await iam.api.setPassword({ userId: created.id, password })

      return {
        roleId: role.id,
        userId: created.id,
        ...(generated ? { generatedPassword: password } : {}),
      }
    })
  })
}

/** onInit gate — prod without Root Admin fails boot. */
export async function assertRootOrAllowBootstrap(payload: Payload): Promise<void> {
  if (await hasRoot(payload)) return
  if (isRootBootstrapAllowed()) return
  throw new Error(MISSING_ROOT_PROD_MESSAGE)
}
