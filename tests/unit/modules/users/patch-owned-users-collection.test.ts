import { describe, expect, test } from 'bun:test'
import type { CollectionConfig } from 'payload'
import { patchOwnedUsersCollection } from '../../../../src/modules/users/collections/patch-owned-users-collection'

const noopAuth = () => ({})

describe('patchOwnedUsersCollection', () => {
  test('adds plugin-owned fields and denies stock create', () => {
    const base: CollectionConfig = {
      slug: 'users',
      fields: [{ name: 'email', type: 'email' }],
    }
    const patched = patchOwnedUsersCollection(base, {
      usersSlug: 'users',
      loginFlags: {
        emailAndPassword: true,
        google: false,
        loginOtp: false,
        forgotPassword: true,
        length: 6,
      },
      getAuth: noopAuth,
    })
    const names = patched.fields?.flatMap((f) => ('name' in f ? [f.name] : [])) ?? []
    expect(names).toContain('roles')
    expect(names).toContain('fullName')
    expect(patched.trash).toBe(false)
    expect(patched.disableBulkDelete).toBe(true)
    expect(patched.access?.create?.({ req: {} as never })).toBe(false)
    expect(patched.admin?.components?.Description).toBe('@klnap/payload-iam/rsc#AccessListTabs')
  })
})
