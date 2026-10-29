# Integration tests (PostgreSQL)

## Ephemeral Docker (default)

When `PAYLOAD_RBAC_TEST_DATABASE_URL` is **unset**, `bun run test:int` (via `scripts/with-ephemeral-postgres.mjs`):

1. Starts container **`payload-iam-test-db`** on host port **5433**
2. Runs integration tests
3. **Removes** the container

Requires Docker on `PATH`.

## CI / persistent local server

Set the env var to skip Docker lifecycle (container is not started or removed by the script):

```bash
export PAYLOAD_RBAC_TEST_DATABASE_URL='postgres://postgres:postgres@localhost:5433/postgres'
bun run test:int
```

Do not point at application `DATABASE_URL` or shared dev databases — harnesses truncate/wipe test data.

Config: `scripts/ephemeral-postgres.config.mjs` (`containerName`, `hostPort`, `envVar`).
