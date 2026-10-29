import type { DefaultCellComponentProps } from 'payload'

/** Roles list — assigned user count. */
export default function RoleUsersCell({ cellData }: DefaultCellComponentProps) {
  const count = typeof cellData === 'number' ? cellData : 0
  return <span>{count}</span>
}
