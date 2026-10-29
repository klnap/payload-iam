import { Section, Text } from '@react-email/components'
import type { ComponentProps, ReactNode } from 'react'
import type { IamEmailThemeResolved } from '#iam/types/email'

type EmailTitleProps = ComponentProps<'div'> & {
  children: ReactNode
  theme: IamEmailThemeResolved
}

function EmailTitle({ children, theme }: EmailTitleProps) {
  const { colors } = theme
  return (
    <Text
      className='m-0 text-base font-medium'
      style={{
        color: colors.primary,
        fontSize: '22px',
        lineHeight: '30px',
        fontWeight: 500,
      }}
    >
      {children}
    </Text>
  )
}

type EmailDescriptionProps = {
  children: ReactNode
  theme: IamEmailThemeResolved
}

function EmailDescription({ children, theme }: EmailDescriptionProps) {
  const { colors } = theme
  return (
    <Text
      className='m-0 mt-4'
      style={{
        color: colors.muted,
        fontSize: '14px',
        lineHeight: '22px',
        fontWeight: 400,
        marginTop: '16px',
      }}
    >
      {children}
    </Text>
  )
}

function EmailContent({ children }: { children: ReactNode }) {
  return (
    <Section className='mt-8' style={{ marginTop: '32px' }}>
      {children}
    </Section>
  )
}

type EmailMetaProps = {
  children: ReactNode
  theme: IamEmailThemeResolved
}

function EmailMeta({ children, theme }: EmailMetaProps) {
  const { colors } = theme
  return (
    <Text
      className='m-0 mt-6'
      style={{
        color: colors.muted,
        fontSize: '12px',
        lineHeight: '20px',
        marginTop: '28px',
      }}
    >
      {children}
    </Text>
  )
}

export const Email = {
  Title: EmailTitle,
  Description: EmailDescription,
  Content: EmailContent,
  Meta: EmailMeta,
}
