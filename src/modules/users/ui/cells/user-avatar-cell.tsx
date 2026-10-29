import type { DefaultCellComponentProps } from 'payload'
import { UserAvatarMark } from '#iam/shared/ui/admin/user-avatar-mark'
/** Users list — letter avatar from fullName / email. */
export default function UserAvatarCell({ rowData }: DefaultCellComponentProps) {
  const name = String((rowData as { fullName?: unknown } | null)?.fullName ?? '').trim()
  const email = String((rowData as { email?: unknown } | null)?.email ?? '').trim()
  return <UserAvatarMark name={name || email} size='sm' />
}
