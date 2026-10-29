# `@klnap/payload-iam`

Payload admin IAM plugin: auth, roles, invitations, users, bootstrap, account self-service.

## Entry points

| Import | Use |
| :--- | :--- |
| `@klnap/payload-iam` | Server — `iam()`, `payload.iam`, bootstrap, permissions |
| `@klnap/payload-iam/client` | Client admin fields & shell UI (`#Name` in import map) |
| `@klnap/payload-iam/rsc` | Server admin views/cells |
| `@klnap/payload-iam/next` | Next `/api/iam/auth/*` route handlers |
| `@klnap/payload-iam/access` | `can.ts` re-export for hosts |
| `@klnap/payload-iam/styles/iam-admin.css` | Precompiled shell CSS; or compile from `./styles/entry.css` with host Tailwind |

See [docs/adr/0002-entry-points.md](docs/adr/0002-entry-points.md).

## Runtime

Payload host runtimes (Vercel, Cloudflare Workers with Payload’s Node compat, Docker) — see [docs/adr/0003-runtime-environments.md](docs/adr/0003-runtime-environments.md). `'use client'` imports `ui/` only, never server barrels or `node:*`.

## Layout

- `src/core/` — pure permissions/ids (no Payload/React)
- `src/modules/*/` — Payload folder dictionary ([docs/adr/0004-payload-module-folder-dictionary.md](docs/adr/0004-payload-module-folder-dictionary.md))
- `src/adapters/` — Better Auth, Payload ALS, PG
- `src/plugin/` — `payload-plugin.ts`, `endpoints.ts`, `runtime/`, `owned-collection-edit-views.ts`
- `src/shared/paths/` — `IAM_AUTH_API_BASE_PATH`, **`IAM_AUTH_ROUTES`** (canonical auth paths per method); see [docs/iam-auth-mount.md](docs/iam-auth-mount.md)
- `specs/` — feature specs; `docs/adr/` — architecture decisions
  - **Testing gate:** [specs/iam-testing.md](specs/iam-testing.md) (layers A–D)

### UI layout (`src/shared/ui` + `modules/*/ui`)

| Area | Path | Purpose |
| :--- | :--- | :--- |
| Admin shell | `shared/ui/admin/` | Footer, session guard, `AdminTabNav`, `user-menu/` |
| Guest routes | `shared/ui/guest/` | `GuestLayout`, `GuestPage`, `guest.styles.ts`, `guest-payload-form.ts` — [specs/iam-ui-shells.md](specs/iam-ui-shells.md) |
| Plugin i18n meta | `plugin/admin-view-meta-title.ts` | English `meta.title` strings for custom admin views |
| RBAC matrix constants | `core/permissions/matrix-constants.ts` | Matrix field/collection slug sets (with `shape.ts`) |
| Auth module UI | `modules/auth/ui/` | `views/`, `components/`, `lib/`, `hooks/` — see [docs/ui-structure.md](docs/ui-structure.md) |
| Feature UI | `modules/<name>/ui/` | Same pattern: `views/`, `components/`, `lib/` per module |

File names: **kebab-case** (`login-form.tsx`); exports **PascalCase** (`LoginForm`). Guest forms: `guest-payload-form.ts` + Payload `login__form` class hooks. Base UI for custom controls; `@payloadcms/ui` for native admin widgets.

Cross-module imports: **`modules/<name>/index.ts`** or **`modules/<name>/ui/index.ts`** only (`bun run check:boundaries`).

## Adding behavior

| Change | Where |
| :--- | :--- |
| HTTP route | `src/plugin/endpoints.ts` (`createRbacEndpoints`) |
| Collection/global access wrap | `src/plugin/wrap-config-access.ts` |
| Host `users` collection wiring | `modules/users/collections/patch-owned-users-collection.ts` |
| Owned collection | `modules/*/collections` + `module.ts` `contributeCollections` |
| Admin client field | implement under `modules/*/ui`, export `src/exports/client.ts`, host `importMap.js` |
| Styles | Tailwind in TSX; host `@source` on this package or import prebuilt `styles/iam-admin.css`; shell via `AdminIamStyles` |
| Role permissions matrix | `modules/rbac/ui/matrix/` — `matrix-tw` (Tailwind), `matrix-ui`, field components under `permissions/` |
| Custom admin models | `defineRbacModel`, `iam({ register \| models })`, spec [specs/custom-rbac-models.md](specs/custom-rbac-models.md) |
| Host `plugins` order | **`iam()` must be last** among plugins that add collections/globals so `applyHostCollectionsAccess` wraps host collections |

## Commands

```bash
bun run test                  # unit + security + arch + test:int (int skips without Postgres)
bun run test:e2e              # Playwright (needs IAM_E2E_BASE_URL + Chromium)
bun run test:host-regression  # HTTP vs live CMS (IAM_HOST_REGRESSION_*)
bun run email:dev      # React Email preview at http://localhost:4101 (./src/emails shims → modules/*/emails)
bun run build:styles   # precompiled `styles/iam-admin.css`
# Host CLI (also `bin`):
bun ./bin/payload-iam.ts create-root
```

See [README.md](./README.md) for integration steps.
