import type { CollectionConfig } from 'payload'
import type { RbacRegisterTab } from './config'
import type { RbacModuleId } from './modules'

export type RbacModuleCollectionContext = {
  register?: RbacRegisterTab[]
}

export type RbacModuleDescriptor = {
  id: RbacModuleId
  ownedCollectionSlugs: readonly string[]
  contributeCollections?: (ctx: RbacModuleCollectionContext) => CollectionConfig[]
  /** Extra Role matrix tabs (merged with host `register` / `models`). */
  contributeRegister?: (ctx: RbacModuleCollectionContext) => RbacRegisterTab[]
}
