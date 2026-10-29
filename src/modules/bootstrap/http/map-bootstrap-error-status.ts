/** Maps bootstrap service errors to HTTP status for bootstrap root POST. */
export function mapBootstrapErrorToHttpStatus(message: string): number {
  if (message.includes('already exists')) return 409
  if (message.includes('production') || message.includes('PAYLOAD_RBAC')) return 403
  return 400
}
