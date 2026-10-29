import { Link } from '@react-email/components'
import { payloadAdminEmailThemeLight } from '#iam/shared/emails/payload-email-theme-tokens'
import type { IamEmailThemeResolved } from '#iam/types/email'

type Props = {
  href: string
  theme: IamEmailThemeResolved
  children: string
}

/** Payload admin primary button (`btn--style-primary`, `--style-radius-s`). */
export function EmailPrimaryButton({ href, theme, children }: Props) {
  const t = payloadAdminEmailThemeLight
  return (
    <Link
      href={href}
      className='inline-block text-center text-[13px] font-normal leading-[22px] no-underline'
      style={{
        backgroundColor: theme.colors.buttonPrimaryBackground,
        color: theme.colors.buttonPrimaryForeground,
        borderRadius: t.radiusS,
        padding: '8px 18px',
        border: '1px solid transparent',
      }}
    >
      {children}
    </Link>
  )
}
