import { Email } from '#iam/shared/emails/layout/email'
import { EmailLayout } from '#iam/shared/emails/layout/email-layout'
import { EmailOtpCode } from '#iam/shared/emails/layout/email-otp-code'
import type { IamEmailRenderProps } from '#iam/types/email'

export type LoginOtpEmailProps = IamEmailRenderProps<'login-otp'>

export function LoginOtpEmail({ data, copy, brand, theme, fonts }: LoginOtpEmailProps) {
  return (
    <EmailLayout
      preview={copy.preview}
      brand={brand}
      theme={theme}
      fonts={fonts}
      footerLine={copy.footerLine}
    >
      <Email.Title theme={theme}>{copy.title}</Email.Title>
      <Email.Description theme={theme}>{copy.body}</Email.Description>
      <Email.Content>
        <EmailOtpCode otp={data.otp} theme={theme} />
      </Email.Content>
      {copy.expiresLine ? <Email.Meta theme={theme}>{copy.expiresLine}</Email.Meta> : null}
    </EmailLayout>
  )
}

export default LoginOtpEmail
