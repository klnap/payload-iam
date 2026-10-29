import type { Payload } from 'payload'
import type { ReactElement } from 'react'
import type { IamEmailTranslationKey } from '#iam/shared/i18n/t-iam'

export type IamEmailKind = 'invitation' | 'login-otp' | 'reset-password' | 'set-password'

export type IamEmailSendKind = 'invite' | 'otp' | 'reset' | 'set-password'

export function emailKindFromSendKind(kind: IamEmailSendKind): IamEmailKind {
  switch (kind) {
    case 'invite':
      return 'invitation'
    case 'otp':
      return 'login-otp'
    case 'reset':
      return 'reset-password'
    case 'set-password':
      return 'set-password'
  }
}

export type IamEmailBrand =
  | {
      kind: 'image'
      /** Wordmark on light backgrounds (matches admin light theme). */
      src: string
      /** Wordmark on dark backgrounds / dark inbox (matches admin dark theme). */
      srcDark?: string
      alt?: string
      width?: number
      height?: number
    }
  | { kind: 'none' }

/** Wordmark paths under `serverURL` (or absolute URLs). Resolved at send time. */
export type IamEmailLogo = {
  src: string
  srcDark?: string
  alt?: string
  width?: number
  height?: number
}

export type IamEmailLocaleOptions = {
  defaultLocale?: string
  resolveLocale?: (args: {
    payload: Payload
    to: string
    userId?: string
    kind: IamEmailSendKind
  }) => Promise<string> | string
}

export type IamEmailThemeColors = {
  primary?: string
  muted?: string
  background?: string
  surface?: string
  containerMaxWidth?: number
}

export type IamEmailThemeFooter = {
  line?: string
  linkUrl?: string
  linkLabel?: string
}

export type IamEmailWebFontFormat = 'woff' | 'woff2'

export type IamEmailFontFace = {
  /** Absolute URL or path under `serverURL` (same rules as `email.logo`). */
  url: string
  format?: IamEmailWebFontFormat
  fontWeight: number
  fontStyle?: 'normal' | 'italic'
}

export type IamEmailFontsOptions = {
  /** CSS `font-family` for body copy. Default Geist Sans. */
  family?: string
  /** Stack after `family` in Tailwind `font-sans`. */
  fallback?: string[]
  /** React Email web-font fallback. Default `Helvetica`. */
  fallbackFontFamily?: 'Helvetica' | 'Arial' | 'Georgia' | 'Times New Roman' | 'Verdana'
  /**
   * Web font files for `<Font>`.
   * Omitted → package default Geist (CDN) when `family` is default; otherwise no `@font-face`.
   * `[]` → system stack only.
   */
  faces?: IamEmailFontFace[]
}

export type IamEmailFontsResolved = {
  family: string
  fallbackStack: string[]
  fallbackFontFamily: NonNullable<IamEmailFontsOptions['fallbackFontFamily']>
  faces: IamEmailFontFace[]
}

export type IamEmailThemeResolved = {
  colors: {
    /** Primary text (`--theme-text` / elevation-900) */
    primary: string
    /** Secondary text (elevation-500) */
    muted: string
    /** Page background (elevation-50) */
    background: string
    /** Card surface (elevation-0) */
    surface: string
    /** Dividers / card border (elevation-150) */
    border: string
    /** Band sections e.g. header/footer (elevation-50) */
    sectionBackground: string
    /** Outline / secondary control border (elevation-250) */
    buttonBorder: string
    /** Primary button fill (`btn--style-primary`) */
    buttonPrimaryBackground: string
    buttonPrimaryForeground: string
    containerMaxWidth: number
  }
  footer?: IamEmailThemeFooter
}

export type IamEmailThemeProvider = (args: {
  payload: Payload
  serverURL: string
  locale: string
  appName: string
}) =>
  | Promise<Partial<IamEmailThemeColors> & { footer?: IamEmailThemeFooter }>
  | (Partial<IamEmailThemeColors> & { footer?: IamEmailThemeFooter })

export type IamInvitationEmailData = {
  inviteUrl: string
  expiresAtIso: string
  appName: string
}

export type IamLoginOtpEmailData = {
  otp: string
  expiresInMinutes: number
  appName: string
}

export type IamResetPasswordEmailData = {
  resetUrl: string
  expiresAtIso: string
  appName: string
}

export type IamSetPasswordEmailData = {
  setPasswordUrl: string
  expiresAtIso: string
  appName: string
}

export type IamEmailDataByKind = {
  invitation: IamInvitationEmailData
  'login-otp': IamLoginOtpEmailData
  'reset-password': IamResetPasswordEmailData
  'set-password': IamSetPasswordEmailData
}

export type IamInvitationEmailCopy = {
  subject: string
  preview: string
  title: string
  body: string
  cta: string
  expiresLine: string
  footerLine?: string
}

export type IamLoginOtpEmailCopy = {
  subject: string
  preview: string
  title: string
  body: string
  otpLabel: string
  otpDivider: string
  signInCta: string
  expiresLine: string
  footerLine?: string
}

export type IamResetPasswordEmailCopy = {
  subject: string
  preview: string
  title: string
  body: string
  cta: string
  expiresLine: string
  footerLine?: string
}

export type IamSetPasswordEmailCopy = {
  subject: string
  preview: string
  title: string
  body: string
  cta: string
  expiresLine: string
  footerLine?: string
}

export type IamEmailCopyByKind = {
  invitation: IamInvitationEmailCopy
  'login-otp': IamLoginOtpEmailCopy
  'reset-password': IamResetPasswordEmailCopy
  'set-password': IamSetPasswordEmailCopy
}

export type IamEmailRenderProps<K extends IamEmailKind> = {
  data: IamEmailDataByKind[K]
  copy: IamEmailCopyByKind[K]
  brand: IamEmailBrand
  theme: IamEmailThemeResolved
  fonts: IamEmailFontsResolved
  extras?: Record<string, unknown>
}

export type IamEmailTemplateComponent<K extends IamEmailKind> = (
  props: IamEmailRenderProps<K>
) => ReactElement

export type IamEmailTemplateRegistry = {
  invitation?: IamEmailTemplateComponent<'invitation'>
  loginOtp?: IamEmailTemplateComponent<'login-otp'>
  resetPassword?: IamEmailTemplateComponent<'reset-password'>
  setPassword?: IamEmailTemplateComponent<'set-password'>
}

export type IamEmailEnrichDataRegistry = {
  invitation?: (args: {
    data: IamInvitationEmailData
    payload: Payload
  }) => Promise<Record<string, unknown>> | Record<string, unknown>
  loginOtp?: (args: {
    data: IamLoginOtpEmailData
    payload: Payload
  }) => Promise<Record<string, unknown>> | Record<string, unknown>
  resetPassword?: (args: {
    data: IamResetPasswordEmailData
    payload: Payload
  }) => Promise<Record<string, unknown>> | Record<string, unknown>
  setPassword?: (args: {
    data: IamSetPasswordEmailData
    payload: Payload
  }) => Promise<Record<string, unknown>> | Record<string, unknown>
}

export type IamEmailOptions = {
  logo?: IamEmailLogo
  fonts?: IamEmailFontsOptions
  locale?: IamEmailLocaleOptions
  theme?: IamEmailThemeProvider
  templates?: Partial<IamEmailTemplateRegistry>
  enrichData?: Partial<IamEmailEnrichDataRegistry>
}

export type EmailRenderContext = {
  serverURL: string
  /** Payload `config.routes.admin` (default `/admin`). */
  adminRoute: string
  appName: string
  locale: string
  from: { address?: string; name?: string }
  brand: IamEmailBrand
  theme: IamEmailThemeResolved
  fonts: IamEmailFontsResolved
  adapterName?: string
  t: (key: IamEmailTranslationKey, vars?: Record<string, string | number>) => string
}
