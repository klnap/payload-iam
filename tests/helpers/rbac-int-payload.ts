import { randomBytes } from 'node:crypto'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig, getPayload, type Payload } from 'payload'
import { extractPool } from '../../src/adapters/pg/pg-host'
import { iam } from '../../src/exports/index'
import type { PayloadWithIam } from '../../src/plugin/runtime/get-payload-iam'

const BA_SECRET = 'rbac-int-test-better-auth-secret-32ch'
const PAYLOAD_SECRET = 'rbac-int-test-payload-secret-32chars!'

export type RbacIntHandle = {
  payload: PayloadWithIam
  destroy: () => Promise<void>
  reset: () => Promise<void>
}

/** Dedicated DB only — avoids wiping a shared app `DATABASE_URL`. */
function resolveIntDatabaseUrl(): string | undefined {
  return process.env.PAYLOAD_RBAC_TEST_DATABASE_URL
}

const HOST_USERS_COLLECTION = {
  slug: 'users',
  fields: [
    { name: 'email', type: 'email' as const },
    { name: 'fullName', type: 'text' as const },
  ],
}

/** Host-owned content collection — IAM wraps model + field access like a real CMS collection. */
export const HOST_ARTICLES_COLLECTION = {
  slug: 'articles',
  admin: { useAsTitle: 'title' },
  fields: [
    { name: 'title', type: 'text' as const, required: true },
    { name: 'body', type: 'text' as const },
    { name: 'secret', type: 'text' as const },
  ],
}

/** Host public-read collection — plugin ∩ host for anonymous (M-6.2.6). */
export const HOST_PAGES_COLLECTION = {
  slug: 'pages',
  admin: { useAsTitle: 'title' },
  access: { read: () => true },
  fields: [{ name: 'title', type: 'text' as const, required: true }],
}

export const HOST_SITE_GLOBAL = {
  slug: 'site-settings',
  fields: [{ name: 'headline', type: 'text' as const }],
}

export const intDatabaseConfigured = Boolean(resolveIntDatabaseUrl())

async function wipeRbacTables(pool: ReturnType<typeof extractPool>) {
  // SQL reset bypasses Payload hooks (e.g. root admin delete guard) for deterministic int isolation.
  await pool.query(
    'TRUNCATE TABLE pages, articles, site_settings, invitations, users_rels, users, roles RESTART IDENTITY CASCADE'
  )
}

async function wipeAuthTables(pool: ReturnType<typeof extractPool>) {
  await pool.query('DELETE FROM auth."verification"')
  await pool.query('DELETE FROM auth."account"')
  await pool.query('DELETE FROM auth."session"')
  await pool.query('DELETE FROM auth."user"')
}

export async function createRbacIntPayload(): Promise<RbacIntHandle> {
  const connectionString = resolveIntDatabaseUrl()
  if (!connectionString) {
    throw new Error('PAYLOAD_RBAC_TEST_DATABASE_URL required for integration tests')
  }

  process.env.DATABASE_URL = connectionString

  const key = `rbac-int-${randomBytes(8).toString('hex')}`

  const config = buildConfig({
    secret: PAYLOAD_SECRET,
    editor: lexicalEditor(),
    serverURL: 'http://rbac-int.test',
    collections: [HOST_USERS_COLLECTION, HOST_ARTICLES_COLLECTION, HOST_PAGES_COLLECTION],
    globals: [HOST_SITE_GLOBAL],
    admin: { user: 'users' },
    email: nodemailerAdapter({
      defaultFromAddress: 'noreply@rbac-int.test',
      defaultFromName: 'RBAC Int',
      transportOptions: { jsonTransport: true },
    }),
    db: postgresAdapter({
      idType: 'uuid',
      allowIDOnCreate: true,
      pool: { connectionString },
      push: true,
    }),
    plugins: [
      iam({
        secret: BA_SECRET,
        methods: {
          emailAndPassword: { enabled: true },
        },
      }),
    ],
  })

  const payload = (await getPayload({ config, key })) as PayloadWithIam
  if (!payload.iam?.api) {
    throw new Error('payload.iam.api missing after init')
  }

  const pool = extractPool(payload)

  async function reset() {
    await wipeAuthTables(pool)
    await wipeRbacTables(pool)
  }

  async function destroy() {
    if (payload.db.destroy) {
      await payload.db.destroy()
    }
  }

  await reset()

  return { payload, destroy, reset }
}

export async function createEditorRole(payload: Payload): Promise<string> {
  const suffix = randomBytes(4).toString('hex')
  const role = await payload.create({
    collection: 'roles',
    data: {
      name: `Editor-${suffix}`,
      permissions: { collections: {}, globals: {}, register: {} },
    },
    overrideAccess: true,
  })
  return String(role.id)
}
