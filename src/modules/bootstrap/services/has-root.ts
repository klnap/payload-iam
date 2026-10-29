import type { Payload } from 'payload'
import { ROOT_ROLE_NAME } from '#iam/modules/bootstrap/config/root'
import { resolveUsersSlugFromPayload } from '#iam/plugin/resolve-users-slug'
import { isSchemaMissingError } from './schema-missing'

/** True when the Root role exists and at least one user holds it. */
export async function hasRoot(payload: Payload, usersSlug?: string): Promise<boolean> {
  try {
    return await hasRootUncaught(payload, usersSlug)
  } catch (error) {
    if (isSchemaMissingError(error)) return false
    throw error
  }
}

async function hasRootUncaught(payload: Payload, usersSlug?: string): Promise<boolean> {
  const usersCollection = usersSlug ?? resolveUsersSlugFromPayload(payload)
  const roles = await payload.find({
    collection: 'roles',
    where: { name: { equals: ROOT_ROLE_NAME } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const rootId = roles.docs[0]?.id
  if (!rootId) return false

  const users = await payload.find({
    collection: usersCollection,
    where: { roles: { contains: rootId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return users.docs.length > 0
}
