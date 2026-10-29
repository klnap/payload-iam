import { Section, Text } from '@react-email/components'
import { payloadAdminEmailThemeLight } from '#iam/shared/emails/payload-email-theme-tokens'
import type { IamEmailThemeResolved } from '#iam/types/email'

type Props = {
  otp: string
  theme: IamEmailThemeResolved
}

/** Isolated OTP line — tap once to select all in supporting clients. */
export function EmailOtpCode({ otp, theme }: Props) {
  const t = payloadAdminEmailThemeLight
  return (
    <Section
      style={{
        backgroundColor: theme.colors.sectionBackground,
        borderRadius: t.radiusS,
        padding: '20px 24px',
        margin: 0,
      }}
    >
      <Text
        className='m-0 font-sans'
        style={{
          color: theme.colors.primary,
          fontSize: '36px',
          letterSpacing: '8px',
          lineHeight: '44px',
          fontWeight: 500,
          textAlign: 'center',
          userSelect: 'all',
          WebkitUserSelect: 'all',
        }}
      >
        {otp}
      </Text>
    </Section>
  )
}
