/** Preview entry for `email:dev` only — implementation: modules/auth/emails/set-password-email.tsx */

import { previewSetPasswordProps } from '#iam/emails/preview-mocks'
import SetPasswordEmailComponent from '#iam/modules/auth/emails/set-password-email'

const SetPasswordEmail = SetPasswordEmailComponent as typeof SetPasswordEmailComponent & {
  PreviewProps: typeof previewSetPasswordProps
}
SetPasswordEmail.PreviewProps = previewSetPasswordProps

export default SetPasswordEmail
export { SetPasswordEmail }
