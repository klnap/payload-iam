# IAM testing strategy (`@klnap/payload-iam`)

Single gate for the IAM plugin.

## Layers

| Layer | Command | When |
| :--- | :--- | :--- |
| **A** Package | `bun test tests/unit tests/security tests/architecture` and `bun run test:int` | CI / every PR |
| **B** Admin E2E | `bun run test:e2e` | CI (Chromium) |
| **C** Host regression | `bun run test:host-regression` | Local (live CMS) |
| **D** Manual lifecycle | Checklist below | Before shipping a release candidate (~2 h) |

Auth UI paths: `/sign-out`, `/session-ended` (not Payload stock `/logout`).

## Environment

### E2E (B)

| Variable | Default |
| :--- | :--- |
| `IAM_E2E_BASE_URL` | `http://localhost:8010` |
| `IAM_E2E_OTP_LOG` | Path to CMS log with `[dev-mail] otp=` |

### Host regression (C)

| Variable | Default |
| :--- | :--- |
| `IAM_HOST_REGRESSION_URL` | `http://localhost:8010` |
| `IAM_HOST_REGRESSION_OTP_LOG` | Same as E2E log |
| `IAM_HOST_REGRESSION_PG_CONTAINER` | Optional Docker name for rate-limit / SQL fixtures |
| `IAM_HOST_REGRESSION_PG_DB` | `payload_iam_audit` |

### Example fixture users (host regression)

Use accounts seeded in your host app’s test database (replace emails/passwords as needed).

| User | Password |
| :--- | :--- |
| `e2e-root@example.test` | *(host-defined)* |
| `e2e-reader@example.test` | *(host-defined)* |

## D — Manual lifecycle

Prep: same `DATABASE_URL`, `EMAIL_USE_CONSOLE` / dev-mail, `generate:importmap` after IAM RSC/client changes.

| D# | Scenario |
| ---: | :--- |
| 1 | Bootstrap + root; duplicate → error |
| 2a | **Panel logout** — user footer → Log out → confirm modal → login |
| 2b | Optional: `/sign-out` view |
| 2c | After logout: `/collections/…` → `login?redirect=` |
| 3 | Login with OTP |
| 4 | Login without OTP or SKIP |
| 5 | Invite → accept → password; resend; duplicate pending |
| 6 | Admin Users → Security → send reset/set → mail → login |
| 7 | Account Security change (ok + wrong current) |
| 8 | **Field spot RBAC** — one field, verify Read / Create / Update / Delete / Publish in matrix + UI |
| 9 | Delete user |
| 10 | Revoke invite |
| 11 | Expired invite |
| 12 | `isActive: false` — cannot login |
| 13 | `/forgot` enumeration-safe |
| 14 | Two browsers; revoke peer on `/account/sessions` |

Optional sign-off record: [manual-signoff-TEMPLATE.md](./manual-signoff-TEMPLATE.md).

## B — E2E map (plugin `tests/e2e/`)

| E# | Covers |
| ---: | :--- |
| E01 | Guest login + forgot layout |
| E02 | Root OTP login |
| E03 | Footer logout + modal (D2a) |
| E03b | Protected redirect (D2c) |
| E04 | Wrong OTP |
| E05–E06 | Forgot |
| E07–E09 | Invite flow |
| E10–E13 | Password flows |
| E14–E16, E26 | RBAC field spot (partial) |
| E17 | Revoke invite |
| E18–E20 | Inactive, delete, sessions |
| E21–E25 | Noroles, ceiling, session-ended, PL |

## C — Host regression map

| C# | Area |
| ---: | :--- |
| C01 | Auth OTP / session |
| C02 | Invite duplicate 409 |
| C03 | Revoke + invalid accept |
| C04 | Expired invite |
| C05 | Anon invite 401 |
| C06 | Password email API |
| C07 | PATCH RBAC sample |
| C08 | Sessions API |
| C09 | Root / junior deny |

## Out of scope

Full slug×CRUD matrix, M-13 module flags, OAuth without credentials, `/logout*`.
