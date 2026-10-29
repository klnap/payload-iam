/** @type {import('./ephemeral-postgres.types').EphemeralPostgresConfig} */
export default {
  containerName: 'payload-iam-test-db',
  hostPort: 5433,
  envVar: 'PAYLOAD_RBAC_TEST_DATABASE_URL',
  image: 'postgres:16-alpine',
  password: 'postgres',
}
