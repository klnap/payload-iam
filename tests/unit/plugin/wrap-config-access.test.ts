import { describe, expect, test } from 'bun:test'
import type { CollectionConfig } from 'payload'
import {
  applyHostCollectionsAccess,
  applyOwnedPackageCollections,
} from '../../../src/plugin/wrap-config-access'

describe('wrap-config-access', () => {
  test('applyOwnedPackageCollections wires invitations list Description', () => {
    const owned = new Set(['invitations', 'roles', 'users'])
    const out = applyOwnedPackageCollections(
      [
        { slug: 'invitations', fields: [] },
        { slug: 'roles', fields: [] },
        { slug: 'posts', fields: [] },
      ],
      owned,
      'users'
    )
    const inv = out.find((c) => c.slug === 'invitations')
    expect(inv?.admin?.components?.Description).toBe('@klnap/payload-iam/rsc#AccessListTabs')
    expect(inv?.admin?.group).toBe(false)
    expect(inv?.versions).toBe(false)
    const roles = out.find((c) => c.slug === 'roles')
    expect(roles?.admin?.components?.Description).toBe('@klnap/payload-iam/rsc#AccessListTabs')
    expect(roles?.admin?.group).toBe(false)
    const posts = out.find((c) => c.slug === 'posts')
    expect(posts?.admin?.components?.Description).toBeUndefined()
  })

  test('applyHostCollectionsAccess wraps non-owned collection fields', () => {
    const owned = new Set(['users'])
    const host: CollectionConfig = { slug: 'posts', fields: [{ name: 'title', type: 'text' }] }
    const out = applyHostCollectionsAccess([host], owned)
    const col = out[0]!
    expect(col.access?.read).toBeDefined()
    expect(col.fields?.[0]).toBeDefined()
  })
})
