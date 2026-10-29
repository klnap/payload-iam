# ADR 0003: Runtime environments (Payload hosts)

## Status

Accepted.

## Context

Hosts deploy Payload on **Vercel**, **Cloudflare Workers** (OpenNext / `nodejs_compat`), **Docker**, and long-lived Node — the same targets Payload documents. Standalone `@klnap/payload-iam` must not introduce extra deploy blockers (especially **Node built-ins in admin client bundles**).

## Decision

| Layer | Where it runs | Rules |
| :--- | :--- | :--- |
| `./client`, `modules/*/ui/**` (`'use client'`) | Browser | No `node:*`, no `modules/*/index.ts` server barrels |
| `.`, `./rsc`, plugin, adapters | Payload **server** bundle | May use `node:crypto`, `node:async_hooks`, `pg` when the host provides Node compatibility (same as Payload Postgres + Better Auth) |
| ALS + `globalThis` registry | Warm serverless / Workers isolate | Intentional; `resolveInternalOperationKind` also reads `req.context` when ALS is unavailable across chunks |

**Not a package concern:** choosing Edge-only Next routes without `nodejs_compat`, or TCP Postgres without the host’s DB adapter (Hyperdrive, etc.).

Monorepo contract for all `@klnap/*` packages: [../../../RUNTIME.md](../../../RUNTIME.md).

## Verification

- `bun test tests/architecture` (`client-runtime-boundary`, `node-import-allowlist`)
- Host app: Turbopack/Next build of Payload admin must not pull `node:async_hooks` into client chunks

## Consequences

- New `node:` imports under `src/` require allowlist + proof they are server-only.
- `./pg/auth-schema` and pool helpers assume a Postgres Payload host — not a second portability tier.
