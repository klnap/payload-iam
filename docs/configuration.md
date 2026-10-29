# Configuration reference

Public entry: **`IAM(options)`** — type **`IamOptions`** in [`src/types/config.ts`](../src/types/config.ts).

## Required

| Option | Validation |
| ------ | ---------- |
| **`secret`** | Non-empty, **≥ 32 characters** |

At least one sign-in method must be active: **email/password** (default on if `methods` omitted) and/or **Google** with `clientId` + `clientSecret`.

## Authentication (`methods`)

| Field | Default | Notes |
| ----- | ------- | ----- |
| `emailAndPassword` | `{ enabled: true }` if omitted | Set `enabled: false` to disable |
| `emailAndPassword.forgotPassword.enabled` | `true` | Requires email/password |
| `emailAndPassword.otp.enabled` | `false` | Email OTP after password |
| `emailAndPassword.otp.length` | `6` | Integer 4–10 |
| `google.enabled` | `true` when `google` block present | Omit `google` to disable OAuth |
| `google.clientId` / `clientSecret` | — | Required when Google active |

## Session (`session`)

Passed to Better Auth. Defaults from [`validateSessionPolicy`](../src/plugin/validate-config.ts):

| Field | Default |
| ----- | ------- |
| `expiresIn` | 604800 (7 days, seconds) |
| `updateAge` | 86400 (1 day) |
| `freshAge` | 86400 (1 day); must be ≤ `expiresIn` |

## RBAC registration

| Option | Purpose |
| ------ | ------- |
| **`register`** | Inline tabs/items for custom admin routes in the roles matrix |
| **`models`** | Same shape; grouped by `model.tab` (default `Custom`) |
| **`registerExtensions`** | Host factory returning extra tabs |

Use **`defineRbacModel`** / **`collectionMatrixModel`** for matrix parity with collections — [specs/custom-rbac-models.md](../specs/custom-rbac-models.md).

## Modules (`modules`)

| Module | Default | Rules |
| ------ | ------- | ----- |
| `auth` | on | Cannot disable |
| `rbac` | on | Cannot disable |
| `bootstrap` | on | Requires `rbac` |
| `users` | on | Disabling removes Access nav and user admin integrations |
| `invitations` | on | Requires `users` |

## Other

| Option | Purpose |
| ------ | ------- |
| **`users`** | Host users `CollectionConfig` override |
| **`email`** | Transactional email branding/templates |
| **`onAudit`** | `(event: Record<string, unknown>) => void` callback |

## Not public (do not pass from host)

Better Auth keys **`baseURL`**, **`basePath`**, **`database`**, **`trustedOrigins`**, **`appName`**, **`databaseHooks`** are derived from Payload and rejected if set on host options ([`validate-config.ts`](../src/plugin/validate-config.ts)). There is **no** public `iam({ betterAuthOptions })` on `IamOptions`.

## Email and OAuth (host setup)

**Email** — configure Payload’s `email` adapter for production invitations, reset, and OTP. Without it, the plugin falls back to a console adapter (dev only). Optional branding: `iam({ email: … })` and helpers under `@klnap/payload-iam/email`.

**Google OAuth** — register redirect URIs:

| Priority | Redirect URI |
| -------- | ------------- |
| **Preferred** | `{SERVER_URL}/api/iam/auth/google/callback` |
| **Legacy** | `{SERVER_URL}/api/iam/auth/callback/google` |

Details: [iam-auth-mount.md](./iam-auth-mount.md).

**Forgot password** — default on with email/password; `methods.emailAndPassword.forgotPassword.enabled: false` hides UI and blocks reset routes.

**Login OTP** — default off; `methods.emailAndPassword.otp.enabled: true`, `length` 4–10.
