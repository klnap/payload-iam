import { describe, expect, test } from 'bun:test'
import {
  buildInvitationEmailCopy,
  buildLoginOtpEmailCopy,
} from '../../../../src/adapters/email/build-email-copy'
import {
  renderInvitationEmailWithContext,
  renderLoginOtpEmailWithContext,
} from '../../../../src/adapters/email/render-iam-email'
import {
  formatExpiresAt,
  resolveEmailRenderContext,
} from '../../../../src/adapters/email/resolve-email-render-context'
import { iamEmailTranslationTrees } from '../../../../src/shared/i18n/email-translations'
import type { IamOptions } from '../../../../src/types/config'

function mockPayload(overrides?: {
  defaultLocale?: string
  serverURL?: string
  adminRoute?: string
  title?: string
}): import('payload').Payload {
  const defaultLocale = overrides?.defaultLocale ?? 'pl'
  return {
    config: {
      serverURL: overrides?.serverURL ?? 'https://cms.example.test',
      routes: { admin: overrides?.adminRoute ?? '/admin' },
      admin: { meta: { title: overrides?.title ?? 'Test CMS' } },
      localization: { defaultLocale, locales: ['pl', 'en', 'de'] },
    },
    secret: 'x'.repeat(32),
  } as import('payload').Payload
}

describe('resolveEmailRenderContext', () => {
  test('uses email.locale.defaultLocale and logo paths', async () => {
    const payload = mockPayload({ defaultLocale: 'en' })
    const options: IamOptions = {
      secret: 'x'.repeat(32),
      email: {
        locale: { defaultLocale: 'de' },
        logo: {
          src: '/brand/logo.png',
          alt: 'Logo',
        },
      },
    }

    const ctx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'user@example.com',
      sendKind: 'invite',
      appName: 'Test CMS',
    })

    expect(ctx.locale).toBe('de')
    expect(ctx.adminRoute).toBe('/admin')
    expect(ctx.brand).toEqual({
      kind: 'image',
      src: 'https://cms.example.test/brand/logo.png',
      alt: 'Logo',
    })
    expect(ctx.t('iam:email:invitationTitle')).toBe(iamEmailTranslationTrees.de.invitationTitle)
  })

  test('resolves custom font faces under serverURL', async () => {
    const payload = mockPayload()
    const options: IamOptions = {
      secret: 'x'.repeat(32),
      email: {
        fonts: {
          family: 'Acme Sans',
          faces: [{ url: '/fonts/acme-regular.woff2', fontWeight: 400 }],
        },
      },
    }
    const ctx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'otp',
      appName: 'Test CMS',
    })
    expect(ctx.fonts.family).toBe('Acme Sans')
    expect(ctx.fonts.faces[0]?.url).toBe('https://cms.example.test/fonts/acme-regular.woff2')
  })
})

describe('buildInvitationEmailCopy', () => {
  test('interpolates expiry in expires line', async () => {
    const payload = mockPayload()
    const options: IamOptions = { secret: 'x'.repeat(32) }
    const ctx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'invite',
      appName: 'Test CMS',
    })
    const copy = buildInvitationEmailCopy(ctx, '2030-01-15T12:00:00.000Z')
    expect(copy.subject).toBe(iamEmailTranslationTrees.en.invitationSubject)
    expect(copy.preview).toBe(iamEmailTranslationTrees.en.invitationPreview)
    expect(copy.body).toBe(iamEmailTranslationTrees.en.invitationBody)
    expect(copy.cta).toBe(iamEmailTranslationTrees.en.invitationCta)
    expect(copy.expiresLine).toContain('2030')
  })

  test('expires line uses long full date', () => {
    expect(formatExpiresAt('2030-06-15T14:30:00.000Z', 'en')).toMatch(/June 15, 2030/)
    expect(formatExpiresAt('2030-06-15T14:30:00.000Z', 'en')).not.toMatch(/Jun 15/)
  })
})

describe('buildLoginOtpEmailCopy', () => {
  test('subject and preview without app name; preview includes TTL', async () => {
    const payload = mockPayload()
    const options: IamOptions = { secret: 'x'.repeat(32) }
    const ctx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'otp',
      appName: 'Test CMS',
    })
    const copy = buildLoginOtpEmailCopy(ctx, 10)
    expect(copy.subject).toBe(iamEmailTranslationTrees.en.loginOtpSubject)
    expect(copy.preview).toBe('Expires in 10 minutes')
    expect(copy.subject).not.toContain('Test CMS')
  })
})

describe('renderInvitationEmailWithContext', () => {
  test('html includes brand image src when configured', async () => {
    const payload = mockPayload()
    const options: IamOptions = {
      secret: 'x'.repeat(32),
      email: {
        logo: {
          src: 'https://cdn.example/brand.png',
          alt: 'Brand',
        },
      },
    }
    const ctx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'invite',
      appName: 'Test CMS',
    })
    const { html, subject, text } = await renderInvitationEmailWithContext({
      ctx,
      payload,
      options,
      inviteUrl: 'https://cms.example.test/invite',
      expiresAt: new Date('2030-01-15T12:00:00.000Z'),
    })
    expect(html).toContain('https://cdn.example/brand.png')
    expect(subject.length).toBeGreaterThan(0)
    expect(text).toContain('https://cms.example.test/invite')
  })

  test('html includes custom web font url', async () => {
    const payload = mockPayload()
    const options: IamOptions = {
      secret: 'x'.repeat(32),
      email: {
        fonts: {
          family: 'Acme Sans',
          faces: [{ url: 'https://fonts.example/acme.woff2', fontWeight: 400 }],
        },
      },
    }
    const ctx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'invite',
      appName: 'Test CMS',
    })
    const { html } = await renderInvitationEmailWithContext({
      ctx,
      payload,
      options,
      inviteUrl: 'https://cms.example.test/invite',
      expiresAt: new Date('2030-01-15T12:00:00.000Z'),
    })
    expect(html).toContain('https://fonts.example/acme.woff2')
    expect(html).toContain('Acme Sans')
  })
})

describe('renderLoginOtpEmailWithContext', () => {
  test('html includes OTP code only (no magic link)', async () => {
    const payload = mockPayload({ adminRoute: '/', serverURL: 'http://localhost:4000' })
    const options: IamOptions = { secret: 'x'.repeat(32) }
    const ctx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'otp',
      appName: 'Test CMS',
    })
    const { html, text } = await renderLoginOtpEmailWithContext({
      ctx,
      payload,
      options,
      otp: '999888',
      expiresInMinutes: 5,
    })
    expect(html).toContain('999888')
    expect(html).not.toContain('login?otp=')
    expect(text).toContain('999888')
    expect(text).not.toContain('login?otp=')
  })
})
