/**
 * Ensure Better Auth tables exist in schema `auth`.
 * Package-owned — Payload `push: true` drops unknown tables in `public`.
 */

export const BA_SCHEMA = 'auth'

const DDL_STATEMENTS = [
  `CREATE SCHEMA IF NOT EXISTS auth`,
  `CREATE TABLE IF NOT EXISTS auth."user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
)`,
  `CREATE TABLE IF NOT EXISTS auth."session" (
  "id" text PRIMARY KEY NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES auth."user"("id") ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS "session_userId_idx" ON auth."session" ("userId")`,
  `CREATE INDEX IF NOT EXISTS "session_expiresAt_idx" ON auth."session" ("expiresAt")`,
  `CREATE INDEX IF NOT EXISTS "session_expiresAt_idx" ON auth."session" ("expiresAt")`,
  `CREATE TABLE IF NOT EXISTS auth."account" (
  "id" text PRIMARY KEY NOT NULL,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES auth."user"("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "payloadRbacProvisioningId" text UNIQUE
)`,
  `CREATE INDEX IF NOT EXISTS "account_userId_idx" ON auth."account" ("userId")`,
  `CREATE TABLE IF NOT EXISTS auth."verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "invitationId" text UNIQUE
)`,
  `CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON auth."verification" ("identifier")`,
  `CREATE INDEX IF NOT EXISTS "verification_expiresAt_idx" ON auth."verification" ("expiresAt")`,
  `CREATE INDEX IF NOT EXISTS "verification_expiresAt_idx" ON auth."verification" ("expiresAt")`,
  `CREATE TABLE IF NOT EXISTS auth."rateLimit" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL,
  "lastRequest" bigint NOT NULL
)`,
  `ALTER TABLE auth."user" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS auth."twoFactor" (
  "id" text PRIMARY KEY NOT NULL,
  "secret" text NOT NULL,
  "backupCodes" text NOT NULL,
  "userId" text NOT NULL REFERENCES auth."user"("id") ON DELETE CASCADE,
  "verified" boolean DEFAULT true,
  "failedVerificationCount" integer DEFAULT 0,
  "lockedUntil" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
)`,
  `CREATE INDEX IF NOT EXISTS "twoFactor_userId_idx" ON auth."twoFactor" ("userId")`,
]

export async function ensureAuthSchema(pool: {
  query: (sql: string) => Promise<unknown>
}): Promise<void> {
  for (const statement of DDL_STATEMENTS) {
    await pool.query(statement)
  }
}
