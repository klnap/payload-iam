/** Preview entry for `email:dev` only — implementation: modules/auth/emails/reset-password-email.tsx */

import { previewResetPasswordProps } from '#iam/emails/preview-mocks'
import ResetPasswordEmailComponent from '#iam/modules/auth/emails/reset-password-email'

const ResetPasswordEmail = ResetPasswordEmailComponent as typeof ResetPasswordEmailComponent & {
  PreviewProps: typeof previewResetPasswordProps
}
ResetPasswordEmail.PreviewProps = previewResetPasswordProps

export default ResetPasswordEmail
export { ResetPasswordEmail }
