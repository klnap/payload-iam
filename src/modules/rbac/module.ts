import type { RbacModuleDescriptor } from '#iam/types/module-descriptor'
import { createRolesCollection } from './collections/roles.collection'

export const rbacModule: RbacModuleDescriptor = {
  id: 'rbac',
  ownedCollectionSlugs: ['roles'],
  contributeCollections: (ctx) => [createRolesCollection(ctx.register)],
}
