import { absolutizePublicUrl } from '#iam/shared/paths/admin-absolute-url'
import type {
  IamEmailFontFace,
  IamEmailFontsOptions,
  IamEmailFontsResolved,
} from '#iam/types/email'

const GEIST_CDN = 'https://cdn.jsdelivr.net/npm/geist@1.7.2/dist/fonts'

export const defaultIamEmailFontFamily = 'Geist Sans'

const DEFAULT_FALLBACK_STACK = ['Helvetica', 'Arial', 'sans-serif'] as const

const DEFAULT_GEIST_FACES: IamEmailFontFace[] = [
  {
    url: `${GEIST_CDN}/geist-sans/Geist-Regular.woff2`,
    format: 'woff2',
    fontWeight: 400,
  },
  {
    url: `${GEIST_CDN}/geist-sans/Geist-Medium.woff2`,
    format: 'woff2',
    fontWeight: 500,
  },
  {
    url: `${GEIST_CDN}/geist-sans/Geist-SemiBold.woff2`,
    format: 'woff2',
    fontWeight: 600,
  },
]

export const defaultIamEmailFonts: IamEmailFontsResolved = {
  family: defaultIamEmailFontFamily,
  fallbackStack: [...DEFAULT_FALLBACK_STACK],
  fallbackFontFamily: 'Helvetica',
  faces: DEFAULT_GEIST_FACES,
}

function resolveFaces(
  serverURL: string,
  options: IamEmailFontsOptions | undefined
): IamEmailFontFace[] {
  if (options?.faces !== undefined) {
    return options.faces.map((face) => ({
      ...face,
      url: absolutizePublicUrl(serverURL, face.url),
      format: face.format ?? 'woff2',
      fontStyle: face.fontStyle ?? 'normal',
    }))
  }
  const family = options?.family ?? defaultIamEmailFontFamily
  if (family !== defaultIamEmailFontFamily) {
    return []
  }
  return defaultIamEmailFonts.faces
}

export function resolveEmailFonts(
  serverURL: string,
  options?: IamEmailFontsOptions
): IamEmailFontsResolved {
  if (!options) return defaultIamEmailFonts

  const family = options.family ?? defaultIamEmailFonts.family
  const fallbackStack = options.fallback ?? defaultIamEmailFonts.fallbackStack
  const fallbackFontFamily = options.fallbackFontFamily ?? defaultIamEmailFonts.fallbackFontFamily

  return {
    family,
    fallbackStack,
    fallbackFontFamily,
    faces: resolveFaces(serverURL, options),
  }
}
