import type { CollectionConfig, Payload } from 'payload'

type AdminUserSource = { admin?: { user?: string | CollectionConfig } }

/** Auth users collection slug — plugin option, then `admin.user`, then `users`. */
export function resolveUsersSlug(incoming: AdminUserSource, users?: CollectionConfig): string {
  if (users?.slug) {
    const adminUser = incoming.admin?.user
    if (typeof adminUser === 'string' && adminUser.length > 0 && adminUser !== users.slug) {
      throw new Error(`rbac: users.slug (${users.slug}) must match admin.user (${adminUser})`)
    }
    return users.slug
  }

  const adminUser = incoming.admin?.user
  if (typeof adminUser === 'string' && adminUser.length > 0) {
    return adminUser
  }

  return 'users'
}

/** Runtime users collection slug from an initialized Payload instance. */
export function resolveUsersSlugFromPayload(payload: Payload): string {
  return resolveUsersSlug(payload.config)
}
