import type { Payload } from 'payload'
import {
  type AccessTab,
  IAM_ACCESS_TAB_PREF_KEY,
  isAccessTab,
} from '#iam/shared/paths/access-paths'

const DEFAULT_TAB: AccessTab = 'users'

export async function readAccessTabPreference(
  payload: Payload,
  user: { id: string | number; collection: string }
): Promise<AccessTab> {
  try {
    const found = await payload.find({
      collection: 'payload-preferences',
      depth: 0,
      limit: 1,
      sort: '-updatedAt',
      where: {
        and: [
          { key: { equals: IAM_ACCESS_TAB_PREF_KEY } },
          { 'user.relationTo': { equals: user.collection } },
          { 'user.value': { equals: user.id } },
        ],
      },
    })
    const value = found.docs[0]?.value
    if (isAccessTab(value)) return value
  } catch {
    // preference optional
  }
  return DEFAULT_TAB
}
