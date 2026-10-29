# ADR 0001: Module architecture

## Status

Accepted.

## Context

`@klnap/payload-iam` bundles RBAC, invitations, auth admin, bootstrap, and users provisioning. Cross-cutting Payload wiring must stay predictable for hosts and agents.

## Decision

- **Modules** live under `src/modules/{auth,bootstrap,invitations,rbac,users,account,access,sessions}/` with a barrel `index.ts` for cross-module imports (folder dictionary: [ADR 0004](./0004-payload-module-folder-dictionary.md)).
- **Core** (`src/core/`) holds pure permission/id helpers — no Payload, React, Better Auth, or PG imports.
- **Adapters** integrate Better Auth, Payload ALS, PG, and email.
- **Plugin** (`src/plugin/`) composes modules via `RBAC_MODULE_REGISTRY` and `createPayloadPlugin`.
- **Exports** (`src/exports/`) are the only public entry surfaces (`index`, `client`, `rsc`, `access`).

## Layer rules

| Layer | May import | Must not import |
| :--- | :--- | :--- |
| `core` | `core` | `modules`, `adapters`, `plugin`, Payload/React/BA/pg npm |
| `modules/*` | `core`, other modules via `modules/<name>/index.ts` only | deep paths into sibling modules |
| `adapters` | `core`, module barrels | `modules/*/ui` |
| `plugin` | all layers | — |
| `exports/index`, `exports/rsc` | server graph | `exports/client` |
| `modules/*/ui`, `shared/ui` | per module rules | `'use client'` outside these trees |

Enforced with `dependency-cruiser` (`check:boundaries`) and `tests/architecture/use-client-boundary.test.ts`.

## Consequences

- New domain code lands in a module folder; cross-module calls go through barrels.
- Ceiling/permission types shared by core and RBAC live in `core/permissions/role-permissions.ts`; RBAC ceiling logic lives in `modules/rbac/domain/ceiling.ts`.
