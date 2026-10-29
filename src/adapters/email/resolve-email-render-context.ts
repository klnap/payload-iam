import type { Payload } from 'payload'
import { emailAdapterName } from '#iam/adapters/payload/deliver-payload-email'
import { payloadAdminEmailThemeLight } from '#iam/shared/emails/payload-email-theme-tokens'
import { defaultIamEmailFonts, resolveEmailFonts } from '#iam/shared/emails/resolve-email-fonts'
import { iamEmailTranslationTrees } from '#iam/shared/i18n/email-translations'
import type { IamEmailTranslationKey } from '#iam/shared/i18n/t-iam'
import { absolutizePublicUrl, readPayloadAdminRoute } from '#iam/shared/paths/admin-absolute-url'
import type { IamOptions } from '#iam/types/config'
import type {
  EmailRenderContext,
  IamEmailBrand,
  IamEmailLogo,
  IamEmailSendKind,
  IamEmailThemeResolved,
} from '#iam/types/email'
import { emailKindFromSendKind } from '#iam/types/email'

const t = payloadAdminEmailThemeLight

const DEFAULT_THEME: IamEmailThemeResolved = {
  colors: {
    primary: t.elevation900,
    muted: t.elevation500,
    background: t.elevation50,
    surface: t.elevation0,
    border: t.elevation150,
    sectionBackground: t.elevation50,
    buttonBorder: t.elevation250,
    buttonPrimaryBackground: t.elevation800,
    buttonPrimaryForeground: t.elevation0,
    containerMaxWidth: t.containerMaxWidth,
  },
}

function readPayloadDefaultLocale(payload: Payload): string | undefined {
  const loc = payload.config.localization
  if (!loc) return undefined
  return loc.defaultLocale
}

function resolveDefaultLocale(_payload: Payload, options: IamOptions): string {
  const fromOptions = options.email?.locale?.defaultLocale
  if (fromOptions) return fromOptions
  return 'en'
}

async function resolveLocale(args: {
  payload: Payload
  options: IamOptions
  to: string
  userId?: string
  sendKind: IamEmailSendKind
}): Promise<string> {
  const resolver = args.options.email?.locale?.resolveLocale
  if (resolver) {
    return resolver({
      payload: args.payload,
      to: args.to,
      userId: args.userId,
      kind: args.sendKind,
    })
  }
  return resolveDefaultLocale(args.payload, args.options)
}

function logoToBrand(serverURL: string, logo: IamEmailLogo): IamEmailBrand {
  return {
    kind: 'image',
    src: absolutizePublicUrl(serverURL, logo.src),
    srcDark: logo.srcDark ? absolutizePublicUrl(serverURL, logo.srcDark) : undefined,
    alt: logo.alt,
    width: logo.width,
    height: logo.height,
  }
}

async function resolveBrand(args: {
  options: IamOptions
  serverURL: string
}): Promise<IamEmailBrand> {
  const logo = args.options.email?.logo
  if (!logo) return { kind: 'none' }
  return logoToBrand(args.serverURL, logo)
}

async function resolveTheme(args: {
  payload: Payload
  options: IamOptions
  serverURL: string
  locale: string
  appName: string
}): Promise<IamEmailThemeResolved> {
  const provider = args.options.email?.theme
  if (!provider) return DEFAULT_THEME
  const partial = await provider({
    payload: args.payload,
    serverURL: args.serverURL,
    locale: args.locale,
    appName: args.appName,
  })
  return {
    colors: {
      primary: partial.primary ?? DEFAULT_THEME.colors.primary,
      muted: partial.muted ?? DEFAULT_THEME.colors.muted,
      background: partial.background ?? DEFAULT_THEME.colors.background,
      surface: partial.surface ?? DEFAULT_THEME.colors.surface,
      border: DEFAULT_THEME.colors.border,
      sectionBackground: DEFAULT_THEME.colors.sectionBackground,
      buttonBorder: DEFAULT_THEME.colors.buttonBorder,
      buttonPrimaryBackground: DEFAULT_THEME.colors.buttonPrimaryBackground,
      buttonPrimaryForeground: DEFAULT_THEME.colors.buttonPrimaryForeground,
      containerMaxWidth: partial.containerMaxWidth ?? DEFAULT_THEME.colors.containerMaxWidth,
    },
    footer: partial.footer,
  }
}

function readFallbackLanguage(payload: Payload, locale: string): string {
  return (
    payload.config.i18n?.fallbackLanguage ?? readPayloadDefaultLocale(payload) ?? locale ?? 'en'
  )
}

function interpolateTemplate(template: string, vars?: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    vars?.[name] != null ? String(vars[name]) : `{{${name}}}`
  )
}

function readHostEmailBucket(payload: Payload, lang: string): Record<string, string> | undefined {
  const translations = payload.config.i18n?.translations as Record<string, any> | undefined
  const bucket = translations?.[lang]?.iam?.email
  if (!bucket || typeof bucket !== 'object') return undefined
  return bucket as Record<string, string>
}

function createEmailTranslator(payload: Payload, locale: string): EmailRenderContext['t'] {
  const fallback = readFallbackLanguage(payload, locale)

  return (key: IamEmailTranslationKey, vars?: Record<string, string | number>) => {
    const suffix = key.replace('iam:email:', '')
    for (const lang of [locale, fallback, 'en']) {
      const hostRaw = readHostEmailBucket(payload, lang)?.[suffix]
      if (typeof hostRaw === 'string') return interpolateTemplate(hostRaw, vars)

      const tree = iamEmailTranslationTrees[lang as keyof typeof iamEmailTranslationTrees]
      const bundled = tree?.[suffix as keyof typeof tree]
      if (typeof bundled === 'string') return interpolateTemplate(bundled, vars)
    }
    return key
  }
}

function readEmailFrom(payload: Payload): { address?: string; name?: string } {
  const email = (
    payload as Payload & { email?: { defaultFromAddress?: string; defaultFromName?: string } }
  ).email
  return {
    address: email?.defaultFromAddress,
    name: email?.defaultFromName,
  }
}

export async function resolveEmailRenderContext(args: {
  payload: Payload
  options: IamOptions
  to: string
  userId?: string
  sendKind: IamEmailSendKind
  appName: string
}): Promise<EmailRenderContext> {
  const { payload, options, to, userId, sendKind, appName } = args
  const serverURL = payload.config.serverURL ?? ''
  const adminRoute = readPayloadAdminRoute(payload.config.routes?.admin)
  const locale = await resolveLocale({ payload, options, to, userId, sendKind })
  const t = createEmailTranslator(payload, locale)
  const fonts = resolveEmailFonts(serverURL, options.email?.fonts)

  const [brand, theme] = await Promise.all([
    resolveBrand({ options, serverURL }),
    resolveTheme({ payload, options, serverURL, locale, appName }),
  ])

  return {
    serverURL,
    adminRoute,
    appName,
    locale,
    from: readEmailFrom(payload),
    brand,
    theme,
    fonts,
    adapterName: emailAdapterName(payload),
    t,
  }
}

export function formatExpiresAt(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export { DEFAULT_THEME as defaultIamEmailTheme, defaultIamEmailFonts, emailKindFromSendKind }
