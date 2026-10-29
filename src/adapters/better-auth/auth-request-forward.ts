import { IAM_AUTH_API_BASE_PATH } from '#iam/shared/paths/auth-api-path'

type AuthHandler = (request: Request) => Response | Promise<Response>

/** Re-dispatch to another path on the same IAM auth mount (Better Auth internal routes). */
export async function forwardIamAuthRequest(
  getHandler: () => AuthHandler,
  request: Request,
  targetPath: string,
  /** Serialized JSON when the incoming request body was already consumed. */
  serializedBody?: string
): Promise<Response> {
  const url = new URL(request.url)
  const normalized = targetPath.startsWith('/') ? targetPath : `/${targetPath}`
  url.pathname = `${IAM_AUTH_API_BASE_PATH}${normalized}`.replace(/\/{2,}/g, '/')

  const method = request.method
  const body = method === 'GET' || method === 'HEAD' ? undefined : serializedBody

  const headers = new Headers(request.headers)
  headers.delete('content-length')
  if (body !== undefined && body !== '') {
    headers.set('content-type', 'application/json')
  }

  return getHandler()(
    new Request(url, {
      method,
      headers,
      body: body === '' ? undefined : body,
    })
  )
}
