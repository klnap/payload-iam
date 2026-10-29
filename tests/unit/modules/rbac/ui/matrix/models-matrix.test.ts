import { describe, expect, test } from 'bun:test'
import { visibleModels } from '../../../../../../src/modules/rbac/ui/matrix/models-matrix'

describe('visibleModels', () => {
  const entities = [
    { slug: 'projects', labels: { singular: 'Project' } },
    { slug: 'media', labels: { singular: 'Media' } },
    { slug: 'users', labels: { singular: 'User' } },
    { slug: 'roles', labels: { singular: 'Role' } },
    { slug: 'invitations', labels: { singular: 'Invitation' } },
    { slug: 'payload-locked-documents', labels: { singular: 'Payload Locked' } },
  ]

  test('content mode = CMS only (no auth, no payload-*)', () => {
    expect(visibleModels(entities, 'content').map((c) => c.slug)).toEqual(['projects', 'media'])
  })

  test('auth mode = users + roles + invitations', () => {
    expect(
      visibleModels(entities, 'auth')
        .map((c) => c.slug)
        .sort()
    ).toEqual(['invitations', 'roles', 'users'])
  })
})
