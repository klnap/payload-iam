import { describe, expect, test } from 'bun:test'
import { emptyPermissions } from '../../../../../../src/core/permissions/shape'
import { createModelMatrixHandlers } from '../../../../../../src/modules/rbac/domain/matrix/matrix-model-handlers'

describe('createModelMatrixHandlers', () => {
  test('setOp toggles collection op and patches permissions', () => {
    const perms = emptyPermissions()
    let next = perms
    const patch = (p: typeof perms) => {
      next = p
    }
    const { setOp } = createModelMatrixHandlers({
      perms,
      patch,
      bucket: 'collections',
      slug: 'posts',
      row: {},
      entityOps: ['read', 'update'],
      fieldOps: ['read', 'update'],
      fields: [],
      can: () => true,
    })
    setOp('read', true)
    expect(next.collections?.posts?.read).toBe(true)
  })

  test('setOp cascades to fields when op is a field op', () => {
    const perms = emptyPermissions()
    let next = perms
    const patch = (p: typeof perms) => {
      next = p
    }
    const { setOp } = createModelMatrixHandlers({
      perms,
      patch,
      bucket: 'globals',
      slug: 'site',
      row: {},
      entityOps: ['read'],
      fieldOps: ['read'],
      fields: [{ path: 'title', label: 'Title' }],
      can: () => true,
    })
    setOp('read', true)
    expect(next.globals?.site?.read).toBe(true)
    expect(next.globals?.site?.fields?.title?.read).toBe(true)
  })

  test('setField refuses enable when parent op off', () => {
    const perms = emptyPermissions()
    let next = perms
    const patch = (p: typeof perms) => {
      next = p
    }
    const { setField } = createModelMatrixHandlers({
      perms,
      patch,
      bucket: 'collections',
      slug: 'posts',
      row: { read: false },
      entityOps: ['read'],
      fieldOps: ['read'],
      fields: [{ path: 'title', label: 'Title' }],
      can: () => true,
    })
    setField('title', 'read', true)
    expect(next.collections?.posts?.fields?.title?.read).toBeUndefined()
  })

  test('setAll off clears fields', () => {
    const perms = {
      collections: {
        posts: { read: true, fields: { title: { read: true } } },
      },
    }
    let next = perms
    const patch = (p: typeof perms) => {
      next = p
    }
    const { setAll } = createModelMatrixHandlers({
      perms,
      patch,
      bucket: 'collections',
      slug: 'posts',
      row: perms.collections!.posts,
      entityOps: ['read'],
      fieldOps: ['read'],
      fields: [{ path: 'title', label: 'Title' }],
      can: () => true,
    })
    setAll(false)
    expect(next.collections?.posts?.read).toBe(false)
    expect(next.collections?.posts?.fields).toEqual({})
  })
})
