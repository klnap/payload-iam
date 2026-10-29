# IAM authentication mount (`/api/iam/auth`)

Sign-in, sign-out, OAuth, and password flows are mounted at **`IAM_AUTH_API_BASE_PATH`** (`/api/iam/auth`).

Session **management** (list, revoke) uses separate routes under `/api/iam/sessions` — see [session-management.md](../specs/session-management.md).

## Route map (canonical)

Import paths from **`IAM_AUTH_ROUTES`** (`shared/paths/auth-routes.ts`). Use these in UI and `postIamAuthJson` — not ad-hoc strings.

| Area | Method | Path |
| :--- | :--- | :--- |
| Session | POST | `/sign-out` |
| Session | GET/POST | `/get-session` |
| Invitations | POST | `/invitations/accept` |
| Email + password | POST | `/email-and-password/sign-in` |
| Email + password | POST | `/email-and-password/reset-password` |
| Email + password | POST | `/email-and-password/set-password` |
| Login OTP | GET | `/email-and-password/login-otp/pending-email` |
| Login OTP | POST | `/email-and-password/login-otp/send` |
| Login OTP | POST | `/email-and-password/login-otp/verify` |
| Google | POST | `/google/sign-in` |
| Google | GET | `/google/callback` |
| Google | POST | `/google/invite/bind` |
| Google | POST | `/google/link` |
| Google | POST | `/google/unlink` |
| Google | GET | `/google/accounts` |

`IAM_AUTH_ROUTES.betterAuth.*` lists Better Auth internal paths still allowed for compatibility (forwards from IAM routes where noted).

## CMS wiring

- Route handler: `app/api/iam/auth/[...all]/route.ts` → `export { GET, POST } from '@klnap/payload-iam/next'` (or `createIamAuthRouteHandlers(config)`)
- Constants: `IAM_AUTH_API_BASE_PATH`, `IAM_AUTH_ROUTES`, `iamAuthApiUrl()`
- Admin fetches: `postIamAuthJson(IAM_AUTH_ROUTES.session.signOut, …)` in `shared/http/json-fetch.ts`

## OAuth redirect URIs

| Provider | Redirect URI (preferred) | Legacy (still allowed) |
| :--- | :--- | :--- |
| Google | `{origin}/api/iam/auth/google/callback` | `{origin}/api/iam/auth/callback/google` |

Update Google Cloud Console when switching to the preferred URI. Remove legacy `{origin}/api/iam/session/callback/google` and `{origin}/api/auth/callback/google`.
