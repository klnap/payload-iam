/** First letter of display name (or email local-part). */
export function getInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const first = trimmed[0]
  return first ? first.toUpperCase() : '?'
}
