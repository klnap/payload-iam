'use client'

import ChangePasswordDrawer from '#iam/modules/account/ui/drawer/change-password-drawer'

type Props = {
  email: string
  forgotPasswordEnabled: boolean
}

export default function AccountSecurityPanel({ email, forgotPasswordEnabled }: Props) {
  return (
    <div className='w-full max-w-none'>
      <ChangePasswordDrawer email={email} forgotPasswordEnabled={forgotPasswordEnabled} />
    </div>
  )
}
