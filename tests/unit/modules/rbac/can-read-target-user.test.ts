import { describe, expect, test } from 'bun:test'
import { canCallerAccessTargetUser } from '../../../../src/modules/rbac/access/can-read-target-user'

const editorPerms = {
  collections: { posts: { read: true } },
  globals: {},
  register: {},
}

const elevatedPerms = {
  collections: { posts: { read: true, update: true, delete: true } },
  globals: {},
  register: {},
}

describe('canCallerAccessTargetUser', () => {
  test('self always allowed', () => {
    const user = { id: '1', roles: [{ permissions: editorPerms }] }
    expect(canCallerAccessTargetUser(user, user)).toBe(true)
  })

  test('root caller can access non-root target', () => {
    const root = { id: 'r', roles: [{ name: 'Root' }] }
    const editor = { id: 'e', roles: [{ permissions: editorPerms }] }
    expect(canCallerAccessTargetUser(root, editor)).toBe(true)
  })

  test('non-root cannot access root target', () => {
    const root = { id: 'r', roles: [{ name: 'Root' }] }
    const editor = { id: 'e', roles: [{ permissions: editorPerms }] }
    expect(canCallerAccessTargetUser(editor, root)).toBe(false)
  })

  test('editor cannot access higher-permission target', () => {
    const editor = { id: 'e', roles: [{ permissions: editorPerms }] }
    const elevated = { id: 'a', roles: [{ permissions: elevatedPerms }] }
    expect(canCallerAccessTargetUser(editor, elevated)).toBe(false)
  })

  test('elevated caller can access editor target', () => {
    const editor = { id: 'e', roles: [{ permissions: editorPerms }] }
    const elevated = { id: 'a', roles: [{ permissions: elevatedPerms }] }
    expect(canCallerAccessTargetUser(elevated, editor)).toBe(true)
  })
})
