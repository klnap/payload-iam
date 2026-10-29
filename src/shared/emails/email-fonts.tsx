import { Font } from '@react-email/components'
import type { IamEmailFontFace, IamEmailFontsResolved } from '#iam/types/email'

export function buildEmailTailwindConfig(fonts: IamEmailFontsResolved) {
  return {
    theme: {
      extend: {
        fontFamily: {
          sans: [fonts.family, ...fonts.fallbackStack],
        },
      },
    },
  } as const
}

function EmailFontFace({ face, fonts }: { face: IamEmailFontFace; fonts: IamEmailFontsResolved }) {
  return (
    <Font
      fontFamily={fonts.family}
      fallbackFontFamily={fonts.fallbackFontFamily}
      webFont={{
        url: face.url,
        format: face.format ?? 'woff2',
      }}
      fontWeight={face.fontWeight}
      fontStyle={face.fontStyle ?? 'normal'}
    />
  )
}

export function EmailFontsHead({ fonts }: { fonts: IamEmailFontsResolved }) {
  if (fonts.faces.length === 0) return null
  return (
    <>
      {fonts.faces.map((face, index) => (
        <EmailFontFace key={`${face.url}-${face.fontWeight}-${index}`} face={face} fonts={fonts} />
      ))}
    </>
  )
}
