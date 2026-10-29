# ADR 0004: Payload module folder dictionary

## Status

Accepted (refactor 2026).

## Context

`packages/payload-iam` modules mixed ad-hoc folders (`permissions/`, `server/`, `state/`, `plugin/` inside modules). Agents and hosts need a single vocabulary aligned with Payload concepts.

## Decision

Each `src/modules/<name>/` uses only this dictionary (+ `methods/` **only** under `auth`):

| Folder | Contents |
| :--- | :--- |
| `collections/` | `*.collection.ts` |
| `endpoints/` | Payload route handlers `*.endpoint.ts` (per module when split) |
| `hooks/` | `*.hook.ts` |
| `access/` | `*.access.ts` |
| `fields/` | Payload field config (not React) |
| `ui/` | `fields/`, `cells/`, `views/`, `components/`, `hooks/`, `api/` |
| `services/` | use-cases; `*.server.ts` server-only here |
| `domain/` | pure module logic |
| `config/` | constants and resolvers |
| `http/` | HTTP response helpers (not Payload `endpoints/`) |
| `emails/` | Module-owned React Email **product** templates (`auth`, `invitations` only) |

**Email ownership:** product templates → `modules/<feature>/emails/`; reusable presentation → `shared/emails/`; rendering/integration → `adapters/email/`; public surface → `exports/email.ts` (re-exports only). `src/emails/` is preview entrypoints (`email:dev --dir ./src/emails`), fixtures, and static assets — not product ownership. Details: [structure-cleanup-decisions.md](../structure-cleanup-decisions.md).

Aggregate plugin HTTP registration stays in `src/plugin/endpoints.ts` (`createRbacEndpoints`) until split into `modules/<x>/endpoints/*.endpoint.ts`.

**Placement:** code used by exactly one module lives in that module; ≥2 modules or global plugin registration → `shared/` or `core/`. `shared/` must not import `modules/` except documented pairs in `dependency-cruiser.config.mjs`.

**`core/`** — cross-module pure logic (`core/identity/`, `core/permissions/`, `core/rbac/`). **Module `domain/`** — e.g. `rbac/domain/ceiling.ts`, `invitations/domain/state-machine.ts`.

### Placement table (`shared/` + loose `core/`)

| Path | Modules using (imports) | Decision | Reason |
| :--- | :--- | :--- | :--- |
| `shared/ui/guest/*` | auth, invitations, account, bootstrap, … | shared | ≥2 modules; guest shell |
| `shared/paths/*` | account, access, users, invitations, rbac, plugin | shared | ≥2 modules |
| `shared/http/json-fetch.ts` | auth, account, users, invitations, rbac | shared | ≥2 modules |
| `shared/lib/cn.ts` | most UI modules | shared | ≥2 modules |
| `shared/i18n/*` | plugin, collections, most UI | shared | ≥2 modules |
| `shared/ui/admin/*` (shell) | plugin global registration | shared | allowlist: global admin chrome |
| `shared/ui/admin/user-footer.tsx` | plugin | shared | imports `rbac/access/admin-panel-user` (depcruise `from` exception) |
| `shared/ui/admin/admin-session-guard.tsx` | plugin | shared | same narrow import exception |
| `core/permissions/matrix-constants.ts` | rbac, core | core | matrix shape + UI |
| `shared/ui/icons/lock-icons.tsx` | account, auth | shared | ≥2 modules |
| `core/identity/*` | auth, users, invitations, rbac, adapters | core | pure; ≥2 modules |
| `core/permissions/*` | rbac, core/rbac | core | pure shared permission math |
| `core/rbac/*` | rbac, plugin, types | core | register model shared |

### Phase 8 rename table (paths only; export names unchanged)

| Old path | New path |
| :--- | :--- |
| `invitations/ui/cells/InvitationActionsCell.tsx` | `actions-cell.tsx` |
| `invitations/ui/drawer/InviteDrawer.tsx` | `invite-drawer.tsx` |
| `invitations/ui/fields/Invitation*.tsx` | `expires-at-field.tsx`, `invite-link-field.tsx`, `renew-field.tsx`, `roles-field.tsx` |
| `rbac/ui/cells/RoleUsersCell.tsx` | `role-users-cell.tsx` |
| `rbac/ui/cells/RolesListCell.tsx` | `roles-list-cell.tsx` |
| `rbac/ui/fields/RoleUsersListField.tsx` | `role-users-list-field.tsx` |
| `rbac/ui/fields/TransferRootField.tsx` | `transfer-root-field.tsx` |
| `rbac/ui/matrix/ModelsMatrix.tsx` | `models-matrix.tsx` |
| `rbac/ui/permissions/Permissions*Field.tsx` | `permissions-*-field.tsx` |
| `sessions/ui/fields/UserSessionsField.tsx` | `user-sessions-field.tsx` |
| `users/ui/cells/UserAvatarCell.tsx` | `user-avatar-cell.tsx` |
| `users/ui/fields/User*.tsx`, `SendResetPasswordField.tsx` | `user-*-field.tsx`, `send-reset-password-field.tsx` |
| `users/ui/tabs/AccessListTabs*.tsx` | `access-list-tabs.tsx`, `access-list-tabs-client.tsx` |
| `shared/ui/icons/LockIcons.tsx` | `lock-icons.tsx` |
| `account/ui/account-tabs.ts` | `account/ui/tabs.ts` |

### Depcruise exceptions

| Rule | Exception |
| :--- | :--- |
| `shared-no-modules` | `user-footer.tsx`, `admin-session-guard.tsx` → `modules/rbac/access/admin-panel-user.ts` |
| `modules-no-cross-module-internals` | Documented client/config imports; additional cross-module UI/service edges listed in [structure-cleanup-decisions.md](../structure-cleanup-decisions.md) (**accept unchanged**) |
| `adapters-email-no-module-internals` | `adapters/email` → `modules/auth/emails/`, `modules/invitations/emails/` only |
| `module-emails-no-adapters-plugin` | Product templates must not import `adapters/` or `plugin/` |

## Consequences

- RBAC ceiling in `domain/ceiling.ts`; hooks in `hooks/*.hook.ts`.
- Bootstrap constants in `config/`; sessions server code in `services/`.
- Auth methods split under `methods/google` and `methods/email-and-password`.
- Styles and path constants under `shared/styles/` and `shared/paths/`.
- `owned-collection-edit-views.ts` under `plugin/`.
