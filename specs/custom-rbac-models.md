# Custom RBAC permission models

Tier-1 spec for host-defined admin views and package-contributed gates.

## Goals

- Gate custom Payload admin views with the same matrix UX as collections/globals.
- **1:1 with Collections matrix** via `collectionMatrixModel({ fields })` + `walkFieldPaths`.
- Per-field matrix columns via `fields[].ops` (subset of model `fieldOps`).

## Config

| Key | Purpose |
| :--- | :--- |
| `iam({ register: [...] })` | Tabs + items (inline) |
| `iam({ models: [...] })` | Items grouped by `model.tab` (default `Custom`) |
| Module `contributeRegister` | Package merges tabs at plugin init |
| `registerExtensions` | Host app glue (`() => RbacRegisterTab[]`, e.g. `rbac-register/`) |

Storage: `roles.permissions.register[id]` — entity ops as boolean keys + optional `fields[path][create|read|update]`.

## Matrix parity with Collections

```ts
import { collectionMatrixModel } from '@klnap/payload-iam'
import { Posts } from './collections/Posts'

export const postsViewModel = collectionMatrixModel({
  id: 'posts-admin-view',
  label: 'Posts view',
  path: '/posts-tool',
  tab: 'Tools',
  fields: Posts.fields, // same rows/labels as Roles → Collections → posts
})
```

Entity columns: `create | read | update | delete | publish` (`publish` only when drafts enabled).  
- **update** — edit content / save draft / parent for field `update`  
- **publish** — publish to live; without it publish mutations are denied  

Field columns: `create | read | update` (empty cells for delete/publish on field rows).

## Per-field ops

Model default field columns: `fieldOps: ['create','read','update']`.

Override per row:

```ts
fields: [
  { path: 'title', label: 'Title' }, // all fieldOps
  { path: 'slug', label: 'Slug', ops: ['read'] }, // read-only row
  { path: 'internal', label: 'Internal', allowUpdate: false },
]
```

Each `fields[].ops` must be ⊆ `fieldOps` and ⊆ entity `ops` (parent row must grant the op).

## `registerExtensions`

```ts
// Host RBAC registration — plugins stay RBAC-agnostic
import { rbacRegisterExtensions } from './rbac-register'

iam({ registerExtensions: rbacRegisterExtensions })
```

## Runtime

```ts
canAccessRegister(user, 'scheduled-events') // read default
canAccessRegister(user, 'queue', 'manage')
canAccessRegisterField(user, 'app', 'settings', 'update')
```

## Commands

See [docs/commands.md](../../../docs/commands.md) — `bun run check:exports`, `bun test tests/unit` in `packages/payload-iam`.
