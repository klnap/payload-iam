import {
  buildInvitationEmailCopy,
  buildLoginOtpEmailCopy,
  buildResetPasswordEmailCopy,
  buildSetPasswordEmailCopy,
} from '#iam/adapters/email/build-email-copy'
import {
  defaultIamEmailFonts,
  defaultIamEmailTheme,
} from '#iam/adapters/email/resolve-email-render-context'
import { iamEmailTranslationTrees } from '#iam/shared/i18n/email-translations'
import type { IamEmailTranslationKey } from '#iam/shared/i18n/t-iam'
import { adminAbsoluteUrl, readPayloadAdminRoute } from '#iam/shared/paths/admin-absolute-url'
import type { EmailRenderContext, IamEmailBrand } from '#iam/types/email'

/** Override for `email:dev` when host CMS uses a non-default `routes.admin` (e.g. `/`). */
const previewAdminRoute = readPayloadAdminRoute(
  typeof process !== 'undefined' ? process.env.IAM_EMAIL_PREVIEW_ADMIN_ROUTE : undefined
)

const previewServerURL = 'http://localhost:4000'

const mockBrand: IamEmailBrand = {
  kind: 'image',
  src: '/static/logo-email-on-light.svg',
  srcDark: '/static/logo-email-on-dark.svg',
  alt: 'Stolbek',
  width: 240,
}

function mockContext(locale: 'en' | 'pl' | 'de' = 'en'): EmailRenderContext {
  const tree = iamEmailTranslationTrees[locale]
  const t = (key: IamEmailTranslationKey, vars?: Record<string, string | number>) => {
    const suffix = key.replace('iam:email:', '')
    const raw = tree[suffix as keyof typeof tree]
    if (typeof raw !== 'string') return key
    return raw.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
      vars?.[name] != null ? String(vars[name]) : `{{${name}}}`
    )
  }
  return {
    serverURL: previewServerURL,
    adminRoute: previewAdminRoute,
    appName: 'Stolbek CMS',
    locale,
    from: {},
    brand: mockBrand,
    theme: defaultIamEmailTheme,
    fonts: defaultIamEmailFonts,
    t,
  }
}

const previewCtx = mockContext('en')

export const previewInvitationCopy = buildInvitationEmailCopy(
  previewCtx,
  '2026-12-31T23:59:59.000Z'
)

export const previewLoginOtpCopy = buildLoginOtpEmailCopy(previewCtx, 10)

export const previewResetPasswordCopy = buildResetPasswordEmailCopy(
  previewCtx,
  '2026-12-31T23:59:59.000Z'
)

export const previewSetPasswordCopy = buildSetPasswordEmailCopy(
  previewCtx,
  '2026-12-31T23:59:59.000Z'
)

export const previewBrand = mockBrand
export const previewTheme = defaultIamEmailTheme
export const previewFonts = defaultIamEmailFonts

export const previewInvitationProps = {
  data: {
    inviteUrl: `${adminAbsoluteUrl(previewServerURL, previewAdminRoute, '/invite/accept')}?token=preview`,
    expiresAtIso: '2026-12-31T23:59:59.000Z',
    appName: previewCtx.appName,
  },
  copy: previewInvitationCopy,
  brand: previewBrand,
  theme: previewTheme,
  fonts: previewFonts,
} as const

export const previewLoginOtpProps = {
  data: {
    otp: '847291',
    expiresInMinutes: 10,
    appName: previewCtx.appName,
  },
  copy: previewLoginOtpCopy,
  brand: previewBrand,
  theme: previewTheme,
  fonts: previewFonts,
} as const

export const previewResetPasswordProps = {
  data: {
    resetUrl: `${adminAbsoluteUrl(previewServerURL, previewAdminRoute, '/reset-password')}#token=preview`,
    expiresAtIso: '2026-12-31T23:59:59.000Z',
    appName: previewCtx.appName,
  },
  copy: previewResetPasswordCopy,
  brand: previewBrand,
  theme: previewTheme,
  fonts: previewFonts,
} as const

export const previewSetPasswordProps = {
  data: {
    setPasswordUrl: `${adminAbsoluteUrl(previewServerURL, previewAdminRoute, '/set-password')}#token=preview`,
    expiresAtIso: '2026-12-31T23:59:59.000Z',
    appName: previewCtx.appName,
  },
  copy: previewSetPasswordCopy,
  brand: previewBrand,
  theme: previewTheme,
  fonts: previewFonts,
} as const
