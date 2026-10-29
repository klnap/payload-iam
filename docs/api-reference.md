# API reference and troubleshooting

## Subpath exports

| Import | Use |
| ------ | --- |
| `@klnap/payload-iam` | `IAM`, bootstrap, RBAC helpers, paths, `getPayloadIam` |
| `@klnap/payload-iam/next` | `export { GET, POST }` for `/api/iam/auth/[...all]` |
| `@klnap/payload-iam/access` | `wrapModelAccess`, `effectivePermissions`, … |
| `@klnap/payload-iam/client` | Import map client components |
| `@klnap/payload-iam/rsc` | Import map server views |
| `@klnap/payload-iam/email` | Email layout/copy helpers |
| `@klnap/payload-iam/paths` | Sign-out / session-ended path constants |
| `@klnap/payload-iam/styles/*` | CSS entry or prebuilt bundle |

Full symbol lists: [`scripts/exports-snapshot.json`](../scripts/exports-snapshot.json) · **`bun run check:exports`**.

## Runtime API

After init, the host uses **`payload.iam.handler`** (Better Auth) and **`payload.iam.api`** (provision, invite, sessions, **`transferRoot`**, **`reconcile`**). IAM REST admin endpoints are Payload **`endpoints`**, not the Next auth route.

RBAC: **`wrapModelAccess`** / **`wrapFieldAccess`**, **`canAccessAdmin`**, **`resolveCallerCeiling`**, **`assertRolesAssignable`**. Custom admin surfaces: [specs/custom-rbac-models.md](../specs/custom-rbac-models.md).

## CLI

```bash
payload-iam create-root [--email <addr>] [--password <secret>] [--full-name <name>] [--config <path>]
```

Production bootstrap sets `PAYLOAD_RBAC_BOOTSTRAP=1` internally ([`create-root-command.ts`](../src/cli/create-root-command.ts)).

## Common failures

| Symptom | Likely fix |
| ------- | ---------- |
| 404 on `/api/iam/auth/*` | Add Next route — [README](../README.md#quick-start) |
| Blank admin / import errors | Fix [import map](./import-map.md); run `check:exports` |
| Collections still open to all admins | Register **`IAM()` last** in `plugins` |
| `secret must be at least 32 characters` | Lengthen `iam({ secret })` |
| Production boot: no Root Admin | Run **`payload-iam create-root`** |
| Google `INVALID_ORIGIN` | Align `SERVER_URL` and browser host (avoid `127.0.0.1` vs `localhost`) |
| OAuth redirect mismatch | Use preferred callback in [configuration](./configuration.md#email-and-oauth-host-setup) |

## Further reading

- [iam-auth-mount.md](./iam-auth-mount.md) — auth route map
- [specs/iam-testing.md](../specs/iam-testing.md) — test layers
- [AGENTS.md](../AGENTS.md) — contributor layout
- [docs/adr/](./adr/) — architecture decisions

**Uncertain without your host:** non–`@payloadcms/db-postgres` adapters (must expose a compatible `pg` pool); exact import map file path (varies by Payload template).
