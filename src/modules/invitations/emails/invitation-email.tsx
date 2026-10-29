import { Email } from '#iam/shared/emails/layout/email'
import { EmailLayout } from '#iam/shared/emails/layout/email-layout'
import { EmailPrimaryButton } from '#iam/shared/emails/layout/email-primary-button'
import type { IamEmailRenderProps } from '#iam/types/email'

export type InvitationEmailProps = IamEmailRenderProps<'invitation'>

export function InvitationEmail({ data, copy, brand, theme, fonts }: InvitationEmailProps) {
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
        <EmailPrimaryButton href={data.inviteUrl} theme={theme}>
          {copy.cta}
        </EmailPrimaryButton>
      </Email.Content>
      {copy.expiresLine ? <Email.Meta theme={theme}>{copy.expiresLine}</Email.Meta> : null}
    </EmailLayout>
  )
}

export default InvitationEmail
