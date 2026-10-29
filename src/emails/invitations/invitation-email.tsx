/** Preview entry for `email:dev` only — implementation: modules/invitations/emails/invitation-email.tsx */

import { previewInvitationProps } from '#iam/emails/preview-mocks'
import InvitationEmailComponent from '#iam/modules/invitations/emails/invitation-email'

const InvitationEmail = InvitationEmailComponent as typeof InvitationEmailComponent & {
  PreviewProps: typeof previewInvitationProps
}
InvitationEmail.PreviewProps = previewInvitationProps

export default InvitationEmail
export { InvitationEmail }
