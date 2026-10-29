import type { ReactNode } from 'react'
import type { IamEmailBrand, IamEmailFontsResolved, IamEmailThemeResolved } from '#iam/types/email'
import { Email } from './email'
import { EmailLayout } from './email-layout'

export type TransactionalEmailLayoutProps = {
  preview: string
  title: string
  intro: string
  brand: IamEmailBrand
  theme: IamEmailThemeResolved
  fonts: IamEmailFontsResolved
  metaLine?: string
  footerLine?: string
  children: ReactNode
}

/** @deprecated Prefer `EmailLayout` + `Email.*` in templates; facade delegates to the new layout. */
export function TransactionalEmailLayout({
  preview,
  title,
  intro,
  brand,
  theme,
  fonts,
  metaLine,
  footerLine,
  children,
}: TransactionalEmailLayoutProps) {
  return (
    <EmailLayout
      preview={preview}
      brand={brand}
      theme={theme}
      fonts={fonts}
      footerLine={footerLine}
    >
      <Email.Title theme={theme}>{title}</Email.Title>
      <Email.Description theme={theme}>{intro}</Email.Description>
      <Email.Content>{children}</Email.Content>
      {metaLine ? <Email.Meta theme={theme}>{metaLine}</Email.Meta> : null}
    </EmailLayout>
  )
}

export const IamTransactionalEmailLayout = TransactionalEmailLayout
