import type { DefaultCellComponentProps } from 'payload'

/** Sync list cell — uses server `roleLabels` (no RelationshipProvider Loading…). */
export default function RolesListCell({ cellData, rowData }: DefaultCellComponentProps) {
  const fromRow = rowData?.roleLabels
  if (typeof fromRow === 'string' && fromRow.trim()) {
    return <span>{fromRow}</span>
  }

  const labels = formatRoleLabels(cellData)
  return <span>{labels || '—'}</span>
}

function formatRoleLabels(cellData: unknown): string {
  if (cellData == null) return ''
  const items = Array.isArray(cellData) ? cellData : [cellData]
  return items
    .flatMap((item) => {
      if (item == null) return []
      if (typeof item === 'object' && 'name' in item && item.name != null) {
        return [String(item.name)]
      }
      return []
    })
    .join(', ')
}
