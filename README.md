# @klnap/payload-iam

Identity and access management for **Payload CMS 3** admin: Better Auth sign-in, RBAC roles matrix, invitations, user provisioning, and account self-service.

**Start here:** [Quick start](#quick-start) → [Admin interface](#admin-interface) → [Documentation](#documentation).

This plugin replaces auth/account admin surfaces and wraps RBAC on host content; it does not replace the full admin app or non-auth collections behavior beyond access rules.

---

## Quick start

Integrate into an **existing Payload 3 + Next.js app on PostgreSQL** and reach a working admin login.

| Requirement | Detail |
| ----------- | ------ |
| Node `^24`, Payload **3.90.2**, Next `>=15`, React **19**, drizzle-orm `>=0.45.2` | Peers in `package.json` |
| Database | **PostgreSQL** with adapter exposing a **pg pool**; Better Auth tables in schema **auth** |
| Env | `DATABASE_URL`, `PAYLOAD_SECRET`, `SERVER_URL`, `iam({ secret })` ≥ 32 chars; Google creds if OAuth on |

**Payload config** — minimal `buildConfig()` for a working login (register **`IAM()` last** among plugins that add collections/globals):

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { IAM } from '@klnap/payload-iam'

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET!,
  serverURL: process.env.SERVER_URL!,
  editor: lexicalEditor(),
  admin: { user: 'users' },
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'fullName', type: 'text' },
      ],
    },
  ],
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL! },
  }),
  plugins: [
    IAM({
      secret: process.env.AUTH_SECRET!, // min 32 characters
      methods: { emailAndPassword: { enabled: true } },
    }),
  ],
})
```

Use a **users** collection matching `admin.user` (default `users`) or `iam({ users: … })`. Without a host email adapter, mail goes to the console (dev only).

**Auth route (required)** — the plugin does not create Next files. Add `app/api/iam/auth/[...all]/route.ts`:

```ts
export { GET, POST } from '@klnap/payload-iam/next'
```

Mount stays **`/api/iam/auth`**. IAM REST (invites, admin sessions) uses Payload **endpoints**, not this handler. [Auth mount map](./docs/iam-auth-mount.md).

**Import map** — register `@klnap/payload-iam/rsc#…` and `client#…` from the plugin; run `payload generate:importmap` or maintain manually. Full table: [docs/import-map.md](./docs/import-map.md) · `bun run check:exports`.

**Styles** — `AdminIamStyles` in `afterNav`; host either SSR-imports `@klnap/payload-iam/styles/iam-admin.css` or compiles Tailwind from `styles/entry.css` ([ADR 0002](./docs/adr/0002-entry-points.md)).

**Production Root Admin** — dev can bootstrap via login UI; production requires `payload-iam create-root --email …` (or pre-provisioned Root). See [configuration](./docs/configuration.md).

**Smoke check**

1. `{SERVER_URL}/admin` — custom login, no import map errors
2. `curl -s -o /dev/null -w "%{http_code}" "${SERVER_URL}/api/iam/auth/get-session"` — not 404
3. Sign in; open `/admin/access` with default modules

---

## Admin interface

**`IAM()` does not replace the whole Payload admin.** Collections, globals, Lexical, and the document editor stay Payload’s. The plugin **replaces auth and account surfaces**, **wraps access** on host content, and **adds** IAM collections and navigation.

### What changes overall

| Kind | What happens |
| ---- | ------------- |
| **Replaced** | Login, logout, session ended, password reset/set, optional forgot password, self-service account views; header account avatar; Payload local password auth on users |
| **Extended** | Users collection (Better Auth strategy, tabs, list UI, RBAC access); every host collection/global (plugin permissions ∩ host `access`) |
| **Added** | roles, invitations, Access nav, Access hub, `/account/*`, invite accept guest view, IAM admin chrome (footer, session guard, styles) |
| **Unchanged** | Admin layout, host content editing, host API slugs — subject to new access rules |

Behavior depends on **`iam({ methods, modules })`**: no forgot-password UI when disabled; no Access link or users patch when `modules.users` is false; no invitations or invite accept when `modules.invitations` is false.

### Before and after (Payload vs IAM)

Paths are under `/admin` unless noted.

| Area | Stock Payload | With `@klnap/payload-iam` |
| ---- | ------------- | --------------------------- |
| **Sign-in** | Local auth login | Better Auth login (email/password, optional OTP/Google); dev bootstrap if no Root |
| **Password flows** | Stock forgot/reset | Plugin forgot / reset / set routes; stock reset route disabled |
| **Logout / idle** | Stock logout | `/sign-out`, `/session-ended` |
| **Header account** | Avatar menu | Hidden — UserFooter in sidebar |
| **Account (self)** | Stock account (if any) | `/account`, sessions, security, linked Google |
| **Users auth** | Local strategy | Better Auth; local strategy disabled |
| **Users admin** | Host fields | Identity, roles, sessions/security tabs, admin actions |
| **Roles / invites** | — | roles, invitations via Access |
| **Host content** | Host `access` only | RBAC ∩ host on every collection/global |
| **Who enters admin** | Authenticated user doc | Active user + Better Auth session + role or Root |
| **Sidebar nav** | Collection groups only | Access link (if `modules.users`); IAM lists via Access hub |

### Authentication and shell (summary)

- **Login** posts to `/api/iam/auth`, not Payload local login; optional Google and email OTP per config.
- **Logout** via `/sign-out` or sidebar UserFooter (confirm modal); session ended on inactivity route.
- **Header avatar** removed — account links live in the sidebar footer.
- **Provisioning users** and users without roles cannot pass `canAccessAdmin`.

### Users, roles, Access (summary)

- **Users** — same slug as host; IAM list columns and edit tabs (Account / Sessions / Security) for admins managing others; ceiling limits role assignment.
- **Roles** — new collection; permissions matrix (collections, globals, access, custom tabs); Root role hidden from list; delegated editors cannot save permissions above their ceiling.
- **Access** — `/access` redirects to the IAM collection list you may read (users, invitations, or roles); tab strip on those lists via AccessListTabs.
- **Invitations** — created via IAM UI/API (not generic “Create New”); public `/invite/accept` for new admins.

Self-service `/account/*` (sessions, password, linked Google) is separate from editing `/collections/users/:id`. Route list and component names: [admin-ui.md](./docs/admin-ui.md).

### Quick answers

| Question | Answer |
| -------- | ------ |
| Full admin rewrite? | No — auth/account + Access + RBAC on top of Payload |
| Default Payload login? | Replaced on configured routes |
| Root vs delegated? | Root bypasses matrix; others bounded by ceiling on roles and invites |

---

## Documentation

| Doc | Contents |
| --- | -------- |
| [configuration.md](./docs/configuration.md) | `IAM()` options, methods, session, modules, OAuth |
| [import-map.md](./docs/import-map.md) | Required `rsc#` / `client#` mappings |
| [admin-ui.md](./docs/admin-ui.md) | Routes, shell, users/roles/invites/account detail |
| [runtime-architecture.md](./docs/runtime-architecture.md) | Init, access control, invitations flow |
| [api-reference.md](./docs/api-reference.md) | Exports, `payload.iam.api`, CLI, troubleshooting |
| [iam-auth-mount.md](./docs/iam-auth-mount.md) | Better Auth URL map |
| [specs/custom-rbac-models.md](./specs/custom-rbac-models.md) | Custom matrix tabs |
| [specs/iam-testing.md](./specs/iam-testing.md) | Unit, E2E, host regression |
| [AGENTS.md](./AGENTS.md) | Contributors |

Programmatic behavior: Better Auth sessions, matrix RBAC, `wrapModelAccess`, caller ceiling, `payload.iam.api`, bootstrap guards — expanded in [api-reference.md](./docs/api-reference.md).

---

## License

MIT — see [LICENSE](./LICENSE).
