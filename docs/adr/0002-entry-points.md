# ADR 0002: Package entry points

## Status

Accepted.

## Context

Payload admin needs both server (RSC) and client components. Host apps import a single package name but must not pull client bundles into server-only code.

## Decision

| Export | Role |
| :--- | :--- |
| `./` (`exports/index.ts`) | Server-only public API — plugin, runtime, bootstrap helpers, permission utilities |
| `./client` | `'use client'` admin fields/chrome referenced as `@klnap/payload-iam/client#Name` |
| `./rsc` | Server admin views/cells as `@klnap/payload-iam/rsc#Name` |
| `./next` | Next.js App Router handlers for `/api/iam/auth/[...all]` — `export { GET, POST } from '@klnap/payload-iam/next'` |
| `./access` | Stable re-export of `can.ts` for hosts (e.g. schedule package) |
| `./styles/entry.css` | Tailwind v4 entry (`@source` on package `src`) for hosts that compile utilities themselves |
| `./styles/iam-admin.css` | Precompiled Tailwind + shell (`bun run build:styles`) |

Hosts maintain Payload **`importMap.js`**, mapping `#Name` paths to `./client` / `./rsc` named exports (see [import-map.md](../import-map.md)).

## Verification

- `bun run check:exports` — runtime symbols per subpath (`scripts/exports-snapshot.json`).
- `bun run check:component-exports` — Payload path strings in `src/` (IAM) or `import-map-paths.ts` (enhanced-ui) match `./client` and `./rsc` exports.
- `bun run check:host-import-map` — optional host `importMap.js` alignment (`PAYLOAD_IMPORT_MAP_PATH`).

## Consequences

- No `'use client'` module is reachable from `index` or `rsc` except via Payload component path strings.
- Hosts maintain the Payload import map manually when `payload generate:importmap` is unsuitable (for example custom CSS export paths).
