import type { CollectionConfig, GlobalConfig } from 'payload'
import { applyRbacFieldAccess } from '#iam/modules/rbac/access/apply-field-access'
import { wrapGlobalAccess, wrapModelAccess } from '#iam/modules/rbac/access/can'
import { mergeOwnedCollectionEditViews } from '#iam/plugin/owned-collection-edit-views'

const ACCESS_LIST_TABS = '@klnap/payload-iam/rsc#AccessListTabs'

/** Owned package collections (roles, invitations) — versions off + model access. */
export function applyOwnedPackageCollections(
  collections: CollectionConfig[],
  packageOwned: Set<string>,
  usersSlug: string
): CollectionConfig[] {
  return collections.map((col) => {
    if (!packageOwned.has(col.slug) || col.slug === usersSlug) return col

    const next = { ...col, versions: false as const }

    if (col.slug === 'roles') {
      next.admin = mergeOwnedCollectionEditViews({
        ...(next.admin ?? {}),
        group: false,
        components: {
          ...(next.admin?.components ?? {}),
          Description: ACCESS_LIST_TABS,
        },
      })
    }

    if (col.slug === 'invitations') {
      next.admin = mergeOwnedCollectionEditViews({
        ...(next.admin ?? {}),
        group: false,
        hidden: false,
        components: {
          ...(next.admin?.components ?? {}),
          Description: ACCESS_LIST_TABS,
        },
      })
    }

    next.access = {
      ...next.access,
      create: wrapModelAccess({
        collection: col.slug,
        op: 'create',
        packageOwned: true,
        hostAccess: next.access?.create,
      }),
      read: wrapModelAccess({
        collection: col.slug,
        op: 'read',
        packageOwned: true,
        hostAccess: next.access?.read,
      }),
      update: wrapModelAccess({
        collection: col.slug,
        op: 'update',
        packageOwned: true,
        hostAccess: next.access?.update,
      }),
      delete: wrapModelAccess({
        collection: col.slug,
        op: 'delete',
        packageOwned: true,
        hostAccess: next.access?.delete,
      }),
    }

    next.fields =
      applyRbacFieldAccess({
        fields: next.fields,
        kind: 'collections',
        slug: col.slug,
        packageOwned: true,
      }) ??
      next.fields ??
      []

    return next
  })
}

/** Host CMS collections — RBAC ∩ host access. */
export function applyHostCollectionsAccess(
  collections: CollectionConfig[],
  packageOwned: Set<string>
): CollectionConfig[] {
  return collections.map((col) => {
    if (packageOwned.has(col.slug)) return col

    const host = col.access
    return {
      ...col,
      access: {
        ...host,
        create: wrapModelAccess({
          collection: col.slug,
          op: 'create',
          packageOwned: false,
          hostAccess: host?.create,
        }),
        read: wrapModelAccess({
          collection: col.slug,
          op: 'read',
          packageOwned: false,
          hostAccess: host?.read,
        }),
        update: wrapModelAccess({
          collection: col.slug,
          op: 'update',
          packageOwned: false,
          hostAccess: host?.update,
        }),
        delete: wrapModelAccess({
          collection: col.slug,
          op: 'delete',
          packageOwned: false,
          hostAccess: host?.delete,
        }),
        unlock: wrapModelAccess({
          collection: col.slug,
          op: 'unlock',
          packageOwned: false,
          hostAccess: host?.unlock,
        }),
        readVersions: wrapModelAccess({
          collection: col.slug,
          op: 'readVersions',
          packageOwned: false,
          hostAccess: host?.readVersions,
        }),
      },
      fields:
        applyRbacFieldAccess({
          fields: col.fields,
          kind: 'collections',
          slug: col.slug,
          packageOwned: false,
        }) ??
        col.fields ??
        [],
    }
  })
}

export function applyGlobalsAccess(globals: GlobalConfig[]): GlobalConfig[] {
  return globals.map((g) => {
    const host = g.access
    return {
      ...g,
      fields:
        applyRbacFieldAccess({
          fields: g.fields,
          kind: 'globals',
          slug: g.slug,
          packageOwned: false,
        }) ??
        g.fields ??
        [],
      access: {
        ...host,
        read: wrapGlobalAccess({
          global: g.slug,
          op: 'read',
          hostAccess: host?.read,
        }),
        update: wrapGlobalAccess({
          global: g.slug,
          op: 'update',
          hostAccess: host?.update,
        }),
        readVersions: wrapGlobalAccess({
          global: g.slug,
          op: 'readVersions',
          hostAccess: host?.readVersions,
        }),
      },
    }
  })
}
