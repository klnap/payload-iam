import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'
import { buildEmailTailwindConfig, EmailFontsHead } from '#iam/shared/emails/email-fonts'
import type { IamEmailBrand, IamEmailFontsResolved, IamEmailThemeResolved } from '#iam/types/email'
import { EmailLogo } from './email-logo'
import { emailThemedLogoHeadStyles } from './email-themed-logo-styles'

export type EmailLayoutProps = {
  preview: string
  brand: IamEmailBrand
  theme: IamEmailThemeResolved
  fonts: IamEmailFontsResolved
  footerLine?: string
  children: ReactNode
}

export function EmailLayout({
  preview,
  brand,
  theme,
  fonts,
  footerLine,
  children,
}: EmailLayoutProps) {
  const { colors } = theme
  const themeFooter = theme.footer
  const footerText = footerLine ?? themeFooter?.line
  const themedLogo = brand.kind === 'image' && Boolean(brand.srcDark)

  const hrStyle = { borderColor: colors.border, margin: 0, width: '100%' }

  return (
    <Html>
      <Tailwind config={buildEmailTailwindConfig(fonts)}>
        <Head>
          <EmailFontsHead fonts={fonts} />
          {themedLogo ? (
            <style dangerouslySetInnerHTML={{ __html: emailThemedLogoHeadStyles }} />
          ) : null}
        </Head>
        <Preview>{preview}</Preview>
        <Body
          className='font-sans'
          style={{
            backgroundColor: colors.background,
            margin: 0,
            padding: '48px 24px',
          }}
        >
          <Container
            className='mx-auto max-w-full'
            style={{
              maxWidth: colors.containerMaxWidth,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Section style={{ padding: '40px 40px' }}>
              <EmailLogo brand={brand} centered />
            </Section>

            <Hr style={hrStyle} />

            <Section style={{ padding: '36px 40px 40px' }}>{children}</Section>

            {footerText ? (
              <Section
                style={{
                  borderTop: `1px solid ${colors.border}`,
                  padding: '40px 40px',
                }}
              >
                <Text
                  className='m-0'
                  style={{
                    color: colors.muted,
                    fontSize: '12px',
                    lineHeight: '18px',
                  }}
                >
                  {footerText}
                  {themeFooter?.linkUrl && themeFooter.linkLabel ? (
                    <>
                      {' '}
                      <Link href={themeFooter.linkUrl} style={{ color: colors.primary }}>
                        {themeFooter.linkLabel}
                      </Link>
                    </>
                  ) : null}
                </Text>
              </Section>
            ) : null}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
