# Admin Auth Matrix (package contract)

Canonical architecture: plan `admin_auth_matrix_e49c8365` (blockers 1–67). This spec is the package-tier acceptance surface.

## In scope

- Auth collections: `users`, `roles`, `invitations`
- Model B lifecycle (Payload phase COMMIT+RELEASE → BA no locks → REACQUIRE)
- Lock order EMAIL → USER → ROOT → ROLE; dedicated `lockPool`
- Closed `InternalOperation`; package-owned Access + `authChannel=ba-admin-session`
- Invitation SM without `accepting`; live uniqueness via `activeUserId`
- Runtime self-check; Gate E + property stubs

## Out of scope

- Content drafts / Payload Versions publish (v1 `publishTargets=[]`)
- Model A shared BA↔Payload TX; SA transfer; email change
- Root Admin hard-delete / soft-trash (ALWAYS DENY)

## Acceptance

1. `User.create` under EMAIL+USER: lookup `provisioningOperationId` before duplicate-email DENY; same key+hash → resume/success.
2. Advisory locks never held across BA Phase B.
3. Package-owned collections DENY without `authChannel=ba-admin-session` (service/anonymous DENY).
4. Active non-root user MUST have `roles.length >= 1` after finalize.
5. Pending invite: `activeUserId === provisioningUserId`; terminal: `activeUserId === null`.
6. Init fails closed if `allowIDOnCreate` false, double wrap, or `lockPool === payload.db.pool`.
7. `Invitation.expire` / `revoke` MUST NOT take EMAIL lock.

## Validation

```bash
bun pkg payload-iam test
bun run gate:quick
```
