import type { DraftsConfigSource } from '#iam/core/rbac/drafts-enabled'

export type MatrixEntityLabelSource = DraftsConfigSource & {
  slug: string
  label?: string | Record<string, string>
  labels?: { singular?: string | Record<string, string> }
  fields?: unknown[]
}

export function pickLocalizedLabel(v: string | Record<string, string> | undefined): string | null {
  if (typeof v === 'string' && v.trim()) return v
  if (v && typeof v === 'object') {
    const first = Object.values(v).find((x) => typeof x === 'string' && x.trim())
    if (typeof first === 'string') return first
  }
  return null
}

export function matrixEntityLabel(entity: MatrixEntityLabelSource): string {
  return (
    pickLocalizedLabel(entity.label) ?? pickLocalizedLabel(entity.labels?.singular) ?? entity.slug
  )
}

export function isPayloadSystemEntity(entity: MatrixEntityLabelSource): boolean {
  const slug = entity.slug.toLowerCase()
  if (slug.startsWith('payload')) return true
  return matrixEntityLabel(entity).toLowerCase().startsWith('payload')
}
