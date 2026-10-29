/** Applied to invite-related Better Auth JSON responses (no host Next.js config). */
export const INVITE_FLOW_RESPONSE_HEADERS: Readonly<Record<string, string>> = {
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
}

export function jsonWithInviteFlowHeaders(
  body: Record<string, unknown>,
  init?: ResponseInit
): Response {
  const headers = new Headers(init?.headers)
  for (const [key, value] of Object.entries(INVITE_FLOW_RESPONSE_HEADERS)) {
    headers.set(key, value)
  }
  return Response.json(body, { ...init, headers })
}
