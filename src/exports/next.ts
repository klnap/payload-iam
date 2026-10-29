/**
 * Next.js App Router — Better Auth mount at `/api/iam/auth/*`.
 *
 * Host `app/api/iam/auth/[...all]/route.ts`:
 * ```ts
 * export { GET, POST } from '@klnap/payload-iam/next'
 * ```
 *
 * Requires the host TypeScript/Next alias `@payload-config` → your Payload config
 * (standard Payload 3 templates). Custom config path: use `createIamAuthRouteHandlers`.
 */
import 'server-only'

import config from '@payload-config'
import { createIamAuthRouteHandlers } from '#iam/next/create-iam-auth-route-handlers'

export type { IamAuthRouteHandlers } from '#iam/next/create-iam-auth-route-handlers'
export { createIamAuthRouteHandlers } from '#iam/next/create-iam-auth-route-handlers'

const { GET, POST } = createIamAuthRouteHandlers(config)

export { GET, POST }
