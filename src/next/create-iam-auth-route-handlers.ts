import type { SanitizedConfig } from 'payload'
import { getPayloadIam } from '#iam/plugin/runtime/get-payload-iam'

export type IamAuthRouteHandlers = {
  GET: (request: Request) => Promise<Response>
  POST: (request: Request) => Promise<Response>
}

/**
 * Next.js App Router handlers for `/api/iam/auth/*` → `payload.iam.handler`.
 *
 * Host route file (when not re-exporting from `@klnap/payload-iam/next`):
 * ```ts
 * import config from '@payload-config'
 * import { createIamAuthRouteHandlers } from '@klnap/payload-iam/next'
 * export const { GET, POST } = createIamAuthRouteHandlers(config)
 * ```
 */
export function createIamAuthRouteHandlers(
  config: SanitizedConfig | Promise<SanitizedConfig>
): IamAuthRouteHandlers {
  async function handler(request: Request): Promise<Response> {
    const payload = await getPayloadIam(config)
    const iamHandler = payload.iam?.handler
    if (!iamHandler) {
      throw new Error(
        'payload.iam.handler missing — register IAM() in payload.config and complete onInit'
      )
    }
    return iamHandler(request)
  }

  return { GET: handler, POST: handler }
}
