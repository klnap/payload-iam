/** Deterministic multi-key order for advisory lock acquisition. */
export function sortUnique(ids: readonly string[]): string[] {
  return [...new Set(ids.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}
