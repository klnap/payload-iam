# Session management

## Problem

Admins and signed-in users need visibility into active Better Auth sessions and a safe way to revoke them.

## Scope

**In:** `/account` self-service space (read-only overview, `/account/sessions`, `/account/security` password change), user footer link, users edit sidebar (admin), Payload `/api/iam/sessions/*` and `/api/iam/users/sessions` endpoints.

**Out:** GeoIP, vendor admin plugins, exposing internal session-mount list routes on the public allowlist.

## Cookies

Session cookies use **unprefixed** names (`session_token`, `two_factor`, `trust_device`, …) via `advanced.cookies` in `compose-auth-options.ts`. After deploy, users must sign in again (old vendor-prefixed cookies are ignored).

**Auth mount** (`/api/iam/auth/*`) establishes sessions; **this spec** covers `/api/iam/sessions/*` lifecycle APIs.

Hosts may override individual names through `iam({ betterAuthOptions: { advanced: { cookies: { … } } } })`.

## Acceptance

1. Signed-in user opens `/account/sessions`, sees active sessions (device, UA, IP, created/updated), can revoke others; current session labeled.
2. Admin with users `update` sees sessions on user edit and can revoke any session for that user.
3. Revoke checks actor owns target or has users update; session must belong to target user.
4. Unit tests for UA parsing and access rules.

## Validation

```bash
bun pkg payload-iam test:unit
bun run gate:quick
```
