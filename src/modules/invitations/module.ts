import type { RbacModuleDescriptor } from '#iam/types/module-descriptor'
import { createInvitationsCollection } from './collections/invitations.collection'

export const invitationsModule: RbacModuleDescriptor = {
  id: 'invitations',
  ownedCollectionSlugs: ['invitations'],
  contributeCollections: () => [createInvitationsCollection()],
}
