import { authModule } from '#iam/modules/auth/module'
import { bootstrapModule } from '#iam/modules/bootstrap/module'
import { invitationsModule } from '#iam/modules/invitations/module'
import { rbacModule } from '#iam/modules/rbac/module'
import { usersModule } from '#iam/modules/users/module'
import type { RbacModuleDescriptor } from '#iam/types/module-descriptor'
import type { ResolvedRbacModules } from '#iam/types/modules'

export type {
  RbacModuleCollectionContext,
  RbacModuleDescriptor,
} from '#iam/types/module-descriptor'

export const RBAC_MODULE_REGISTRY: readonly RbacModuleDescriptor[] = [
  rbacModule,
  invitationsModule,
  authModule,
  bootstrapModule,
  usersModule,
]

export function enabledModuleDescriptors(modules: ResolvedRbacModules): RbacModuleDescriptor[] {
  return RBAC_MODULE_REGISTRY.filter((descriptor) => modules[descriptor.id])
}

export function ownedCollectionSlugsFor(modules: ResolvedRbacModules): Set<string> {
  const slugs = new Set<string>()
  for (const descriptor of enabledModuleDescriptors(modules)) {
    for (const slug of descriptor.ownedCollectionSlugs) {
      slugs.add(slug)
    }
  }
  return slugs
}
