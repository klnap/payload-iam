# Invitation expiry scheduling (host CMS)

The `@klnap/payload-iam` plugin exposes `api.expireInvitation` on the Payload RBAC surface. It does **not** register a Payload job or cron task. Pending invitations stay `pending` until something calls expiry.

## Host responsibility

Schedule a recurring task in the CMS app (or infrastructure) that:

1. Obtains a Payload instance with IAM initialized (`payload.iam.api`).
2. Calls `runExpireStaleInvitations` (exported from `@klnap/payload-iam`) with a **system** actor:

```ts
import { runExpireStaleInvitations } from '@klnap/payload-iam'

await runExpireStaleInvitations({
  payload,
  api: payload.iam.api,
  actor: { type: 'system', reason: 'invitation-expiry-cron' },
})
```

3. Runs at an interval aligned with invite TTL policy (e.g. every 15 minutes). The helper queries `pending` invitations with `expiresAt < now` (default batch size 100).

## Failure handling

`runExpireStaleInvitations` returns `{ scanned, expired, errors }`. Log `errors` in the host job; individual CAS misses or race conditions should not abort the whole batch.

## Related matrix

See [admin-auth-matrix.md](./admin-auth-matrix.md): `Invitation.expire` must not take the EMAIL advisory lock.
