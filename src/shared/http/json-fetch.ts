import { iamAuthApiUrl } from '#iam/shared/paths/auth-api-path'

export class HttpJsonError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'HttpJsonError'
    this.status = status
    this.code = code
  }
}

type JsonRecord = Record<string, unknown>

async function parseJson(res: Response): Promise<JsonRecord> {
  return (await res.json().catch(() => ({}))) as JsonRecord
}

/** POST JSON to a Payload-relative API path (e.g. `/api/iam/invitations/invite`). */
export async function postJson<T extends JsonRecord = JsonRecord>(
  url: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    const code = typeof data.code === 'string' ? data.code : undefined
    const message = String(data.error ?? `Request failed (${res.status})`)
    throw new HttpJsonError(message, res.status, code)
  }
  return data as T
}

/** POST JSON to `/api/iam/...` (path is `/iam/{module}/...`, without `/api`). */
export async function postIamJson<T extends JsonRecord = JsonRecord>(
  path: string,
  body: unknown
): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (!normalized.startsWith('/iam/')) {
    throw new Error(`IAM API path must start with /iam/: got ${normalized}`)
  }
  return postJson<T>(`/api${normalized}`, body)
}

/** POST JSON to `/api/iam/auth/*` (relative path e.g. `/sign-out`). */
export async function postIamAuthJson<T extends JsonRecord = JsonRecord>(
  path: string,
  body: unknown
): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const res = await fetch(iamAuthApiUrl(normalized), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await parseJson(res)
  const authError = typeof data.error === 'string' ? data.error.trim() : ''
  if (!res.ok) {
    const code = typeof data.code === 'string' ? data.code : undefined
    const message = authError || String(data.message ?? `Request failed (${res.status})`)
    throw new HttpJsonError(message, res.status, code)
  }
  if (authError) {
    const code = typeof data.code === 'string' ? data.code : undefined
    throw new HttpJsonError(authError, res.status, code)
  }
  return data as T
}
