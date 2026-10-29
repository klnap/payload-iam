/** True when Postgres/Drizzle reports a missing table/relation (empty DB before migrate). */
export function isSchemaMissingError(error: unknown): boolean {
  const candidates: unknown[] = [error]
  if (error && typeof error === 'object' && 'cause' in error) {
    candidates.push((error as { cause?: unknown }).cause)
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const code = (candidate as { code?: string }).code
    if (code === '42P01') return true
    const message = (candidate as { message?: string }).message
    if (typeof message === 'string' && /relation .* does not exist/i.test(message)) {
      return true
    }
  }

  if (error instanceof Error && /relation .* does not exist/i.test(error.message)) {
    return true
  }

  return false
}
