/** Parent path for nested field permissions (`sync.status` → `sync`). */
export function parentFieldPath(path: string): string | null {
  const idx = path.lastIndexOf('.')
  if (idx <= 0) return null
  return path.slice(0, idx)
}

/** Nested field op requires every ancestor field to grant the same op. */
export function fieldAncestorOpsAllow(
  fieldPath: string,
  op: string,
  fieldOpOn: (path: string, op: string) => boolean
): boolean {
  let current = parentFieldPath(fieldPath)
  while (current) {
    if (!fieldOpOn(current, op)) return false
    current = parentFieldPath(current)
  }
  return true
}

/** `true` when `path` is a descendant of `ancestor` (dot-separated). */
export function isDescendantFieldPath(path: string, ancestor: string): boolean {
  return path !== ancestor && path.startsWith(`${ancestor}.`)
}
