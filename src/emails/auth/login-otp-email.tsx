/** Preview entry for `email:dev` only — implementation: modules/auth/emails/login-otp-email.tsx */

import { previewLoginOtpProps } from '#iam/emails/preview-mocks'
import LoginOtpEmailComponent from '#iam/modules/auth/emails/login-otp-email'

const LoginOtpEmail = LoginOtpEmailComponent as typeof LoginOtpEmailComponent & {
  PreviewProps: typeof previewLoginOtpProps
}
LoginOtpEmail.PreviewProps = previewLoginOtpProps

export default LoginOtpEmail
export { LoginOtpEmail }
