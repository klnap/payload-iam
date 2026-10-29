import { Img, Section } from '@react-email/components'
import {
  DEFAULT_EMAIL_WORDMARK_WIDTH,
  emailWordmarkHeight,
} from '#iam/shared/emails/email-wordmark-aspect'
import type { IamEmailBrand } from '#iam/types/email'
import {
  EMAIL_THEMED_LOGO_CLASS_DARK,
  EMAIL_THEMED_LOGO_CLASS_LIGHT,
} from './email-themed-logo-styles'

type Props = {
  brand: IamEmailBrand
  centered?: boolean
}

function wordmarkDimensions(brand: Extract<IamEmailBrand, { kind: 'image' }>) {
  const width = brand.width ?? DEFAULT_EMAIL_WORDMARK_WIDTH
  const height = brand.height ?? emailWordmarkHeight(width)
  return { width, height }
}

export function EmailLogo({ brand, centered = false }: Props) {
  if (brand.kind === 'none') {
    return null
  }

  const { width, height } = wordmarkDimensions(brand)
  const imgClass = centered ? 'mx-auto block' : 'block'

  if (brand.srcDark) {
    return (
      <Section className={centered ? 'text-center' : undefined}>
        <Img
          src={brand.src}
          alt={brand.alt ?? ''}
          width={width}
          height={height}
          className={`${EMAIL_THEMED_LOGO_CLASS_LIGHT} ${imgClass}`}
        />
        <Img
          src={brand.srcDark}
          alt={brand.alt ?? ''}
          width={width}
          height={height}
          className={`${EMAIL_THEMED_LOGO_CLASS_DARK} ${imgClass}`}
        />
      </Section>
    )
  }

  return (
    <Section className={centered ? 'text-center' : undefined}>
      <Img
        src={brand.src}
        alt={brand.alt ?? ''}
        width={width}
        height={height}
        className={imgClass}
      />
    </Section>
  )
}
