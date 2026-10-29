/**
 * Declarative RBAC integration cases — maps to M-6.2.* / BA-C.* (representative, not 1:1 per slug×op UI).
 */
import type { RolePermissions } from '../../../src/modules/rbac/access/can'

export type CollectionOp = 'read' | 'create' | 'update' | 'delete'

export type PermissionMatrixCase = {
  /** Traceability to manual matrix */
  mapsTo: string[]
  slug: 'articles' | 'pages' | 'users' | 'roles'
  op: CollectionOp
  /** Role grants (non-root human) */
  grants: RolePermissions['collections']
  /** When true, use Root role instead of grants */
  asRoot?: boolean
  /** null = anonymous */
  session: 'anon' | 'human' | 'root'
  expect: 'allow' | 'deny'
}

const readOnly: RolePermissions['collections'] = {
  articles: { read: true },
}

const fullArticles: RolePermissions['collections'] = {
  articles: { read: true, create: true, update: true, delete: true },
}

const usersRead: RolePermissions['collections'] = {
  users: { read: true },
}

function articleOpCases(
  grants: RolePermissions['collections'],
  expectMap: Record<CollectionOp, 'allow' | 'deny'>,
  mapsPrefix: string
): PermissionMatrixCase[] {
  return (['read', 'create', 'update', 'delete'] as CollectionOp[]).map((op) => ({
    mapsTo: [`M-6.2.${op === 'read' ? '2' : '4'}`, mapsPrefix, `BA-C.articles.${op}`],
    slug: 'articles',
    op,
    grants,
    session: 'human',
    expect: expectMap[op],
  }))
}

/** Generated + hand-picked cases — integration substitutes for hundreds of browser clicks. */
export const PERMISSION_MATRIX_CASES: PermissionMatrixCase[] = [
  ...articleOpCases(
    readOnly,
    { read: 'allow', create: 'deny', update: 'deny', delete: 'deny' },
    'read-only-role'
  ),
  ...articleOpCases(
    fullArticles,
    { read: 'allow', create: 'allow', update: 'allow', delete: 'allow' },
    'full-articles-role'
  ),
  {
    mapsTo: ['M-6.2.5', 'M-6.2.1'],
    slug: 'articles',
    op: 'delete',
    grants: {},
    session: 'root',
    asRoot: true,
    expect: 'allow',
  },
  {
    mapsTo: ['M-6.2.1', 'M-10.2'],
    slug: 'articles',
    op: 'read',
    grants: {},
    session: 'anon',
    expect: 'deny',
  },
  {
    mapsTo: ['M-6.2.6'],
    slug: 'pages',
    op: 'read',
    grants: {},
    session: 'anon',
    expect: 'allow',
  },
  {
    mapsTo: ['M-10.2', 'BA-C.users.Reader'],
    slug: 'users',
    op: 'read',
    grants: {},
    session: 'human',
    expect: 'deny',
  },
  {
    mapsTo: ['M-6.2.2', 'BA-C.users.Junior'],
    slug: 'users',
    op: 'read',
    grants: usersRead,
    session: 'human',
    expect: 'allow',
  },
  {
    mapsTo: ['M-6.2.2'],
    slug: 'users',
    op: 'create',
    grants: usersRead,
    session: 'human',
    expect: 'deny',
  },
  {
    mapsTo: ['M-10.2'],
    slug: 'roles',
    op: 'read',
    grants: {},
    session: 'anon',
    expect: 'deny',
  },
]
