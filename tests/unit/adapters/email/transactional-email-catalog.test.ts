import { describe, expect, test } from 'bun:test'
import { render } from '@react-email/render'
import { createElement } from 'react'
import {
  buildInvitationEmailCopy,
  buildLoginOtpEmailCopy,
  buildResetPasswordEmailCopy,
  buildSetPasswordEmailCopy,
} from '../../../../src/adapters/email/build-email-copy'
import {
  renderInvitationEmailWithContext,
  renderLoginOtpEmailWithContext,
  renderResetPasswordEmailWithContext,
  renderSetPasswordEmailWithContext,
} from '../../../../src/adapters/email/render-iam-email'
import {
  renderInvitationEmail,
  renderLoginOtpEmail,
  renderResetPasswordEmail,
  renderSetPasswordEmail,
} from '../../../../src/adapters/email/render-transactional-emails'
import { resolveEmailRenderContext } from '../../../../src/adapters/email/resolve-email-render-context'
// Preview entry shims (`src/emails/**`) — *Preview bindings attach PreviewProps for email:dev.
import LoginOtpEmailPreview from '../../../../src/emails/auth/login-otp-email'
import ResetPasswordEmailPreview from '../../../../src/emails/auth/reset-password-email'
import SetPasswordEmailPreview from '../../../../src/emails/auth/set-password-email'
import InvitationEmailPreview from '../../../../src/emails/invitations/invitation-email'
import {
  previewInvitationProps,
  previewLoginOtpProps,
  previewResetPasswordProps,
  previewSetPasswordProps,
  previewTheme,
} from '../../../../src/emails/preview-mocks'
// Product implementation (`modules/auth/emails/**`) — used for render/HTML assertions.
import LoginOtpEmail from '../../../../src/modules/auth/emails/login-otp-email'
import { TransactionalEmailLayout } from '../../../../src/shared/emails/layout/transactional-email-layout'
import { iamEmailTranslationTrees } from '../../../../src/shared/i18n/email-translations'
import type { IamOptions } from '../../../../src/types/config'
import type { IamEmailSendKind } from '../../../../src/types/email'
import { emailKindFromSendKind } from '../../../../src/types/email'

const SEND_KINDS: IamEmailSendKind[] = ['invite', 'otp', 'reset', 'set-password']

function mockPayload(): import('payload').Payload {
  return {
    config: {
      serverURL: 'https://cms.example.test',
      routes: { admin: '/admin' },
      admin: { meta: { title: 'Test CMS' } },
      localization: { defaultLocale: 'en', locales: ['en', 'pl', 'de'] },
    },
    secret: 'x'.repeat(32),
  } as import('payload').Payload
}

const options: IamOptions = { secret: 'x'.repeat(32) }

describe('transactional email catalog', () => {
  test('maps every send kind to a template kind', () => {
    expect(emailKindFromSendKind('invite')).toBe('invitation')
    expect(emailKindFromSendKind('otp')).toBe('login-otp')
    expect(emailKindFromSendKind('reset')).toBe('reset-password')
    expect(emailKindFromSendKind('set-password')).toBe('set-password')
  })

  test('pl and de include every en iam:email key', () => {
    const enKeys = Object.keys(iamEmailTranslationTrees.en).sort()
    for (const locale of ['pl', 'de'] as const) {
      const keys = Object.keys(iamEmailTranslationTrees[locale]).sort()
      expect(keys).toEqual(enKeys)
    }
  })

  test('React Email preview entrypoints expose PreviewProps', () => {
    expect(InvitationEmailPreview.PreviewProps).toBe(previewInvitationProps)
    expect(LoginOtpEmailPreview.PreviewProps).toBe(previewLoginOtpProps)
    expect(ResetPasswordEmailPreview.PreviewProps).toBe(previewResetPasswordProps)
    expect(SetPasswordEmailPreview.PreviewProps).toBe(previewSetPasswordProps)
  })

  test('resolveEmailRenderContext for each send kind', async () => {
    const payload = mockPayload()
    for (const sendKind of SEND_KINDS) {
      const ctx = await resolveEmailRenderContext({
        payload,
        options,
        to: 'user@example.com',
        sendKind,
        appName: 'Test CMS',
      })
      expect(ctx.locale).toBe('en')
      expect(ctx.t('iam:email:footerLine').length).toBeGreaterThan(0)
    }
  })

  test('copy builders produce subject and preview for all kinds', async () => {
    const payload = mockPayload()
    const ctx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'invite',
      appName: 'Test CMS',
    })
    const expiresIso = '2030-01-15T12:00:00.000Z'

    const cases = [
      buildInvitationEmailCopy(ctx, expiresIso),
      buildLoginOtpEmailCopy(ctx, 10),
      buildResetPasswordEmailCopy(ctx, expiresIso),
      buildSetPasswordEmailCopy(ctx, expiresIso),
    ]

    for (const copy of cases) {
      expect(copy.subject.length).toBeGreaterThan(0)
      expect(copy.preview.length).toBeGreaterThan(0)
      expect(copy.title.length).toBeGreaterThan(0)
      expect(copy.body.length).toBeGreaterThan(0)
      expect(copy.expiresLine.length).toBeGreaterThan(0)
    }
  })

  test('renderWithContext returns html, text, and subject for all kinds', async () => {
    const payload = mockPayload()
    const expiresAt = new Date('2030-01-15T12:00:00.000Z')

    const inviteCtx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'invite',
      appName: 'Test CMS',
    })
    const invite = await renderInvitationEmailWithContext({
      ctx: inviteCtx,
      payload,
      options,
      inviteUrl: 'https://cms.example.test/invite',
      expiresAt,
    })
    expect(invite.subject).toBe(iamEmailTranslationTrees.en.invitationSubject)
    expect(invite.html).toContain('https://cms.example.test/invite')
    expect(invite.text).toContain('https://cms.example.test/invite')

    const otpCtx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'otp',
      appName: 'Test CMS',
    })
    const otp = await renderLoginOtpEmailWithContext({
      ctx: otpCtx,
      payload,
      options,
      otp: '112233',
      expiresInMinutes: 5,
    })
    expect(otp.subject).toBe(iamEmailTranslationTrees.en.loginOtpSubject)
    expect(otp.html).toContain('112233')
    expect(otp.text).toContain('112233')

    const resetCtx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'reset',
      appName: 'Test CMS',
    })
    const reset = await renderResetPasswordEmailWithContext({
      ctx: resetCtx,
      payload,
      options,
      resetUrl: 'https://cms.example.test/reset#token=abc',
      expiresAt,
    })
    expect(reset.subject).toBe(iamEmailTranslationTrees.en.resetPasswordSubject)
    expect(reset.html).toContain('https://cms.example.test/reset#token=abc')
    expect(reset.text).toContain('https://cms.example.test/reset#token=abc')

    const setCtx = await resolveEmailRenderContext({
      payload,
      options,
      to: 'a@b.c',
      sendKind: 'set-password',
      appName: 'Test CMS',
    })
    const setPw = await renderSetPasswordEmailWithContext({
      ctx: setCtx,
      payload,
      options,
      setPasswordUrl: 'https://cms.example.test/set-password#token=xyz',
      expiresAt,
    })
    expect(setPw.subject).toBe(iamEmailTranslationTrees.en.setPasswordSubject)
    expect(setPw.html).toContain('https://cms.example.test/set-password#token=xyz')
    expect(setPw.text).toContain('https://cms.example.test/set-password#token=xyz')
  })

  test('final HTML includes layout, Email slots, theme, and themed logo', async () => {
    const html = await render(createElement(LoginOtpEmail, previewLoginOtpProps))
    const copy = previewLoginOtpProps.copy

    expect(html).toContain(copy.title)
    expect(html).toContain(copy.body)
    expect(html).toContain(copy.expiresLine)
    expect(html).toContain(copy.footerLine)
    expect(html).toContain(previewLoginOtpProps.data.otp)
    expect(html).toContain(previewTheme.colors.background)
    expect(html).toContain(previewTheme.colors.surface)
    expect(html).toContain('/static/logo-email-on-light.svg')
    expect(html).toContain('/static/logo-email-on-dark.svg')
    expect(html).toContain('iam-email-logo-light')
    expect(html).toContain('iam-email-logo-dark')
  })

  test('final HTML omits logo when brand kind is none', async () => {
    const html = await render(
      createElement(LoginOtpEmail, {
        ...previewLoginOtpProps,
        brand: { kind: 'none' },
      })
    )
    expect(html).not.toContain('/static/logo-email-on-light.svg')
    expect(html).not.toContain('iam-email-logo-light')
    expect(html).toContain(previewLoginOtpProps.copy.title)
  })

  test('TransactionalEmailLayout facade renders Email slots in final HTML', async () => {
    const html = await render(
      createElement(TransactionalEmailLayout, {
        preview: previewLoginOtpProps.copy.preview,
        title: previewLoginOtpProps.copy.title,
        intro: previewLoginOtpProps.copy.body,
        brand: previewLoginOtpProps.brand,
        theme: previewLoginOtpProps.theme,
        fonts: previewLoginOtpProps.fonts,
        metaLine: previewLoginOtpProps.copy.expiresLine,
        footerLine: previewLoginOtpProps.copy.footerLine,
        children: createElement('span', null, 'facade-content-slot'),
      })
    )
    expect(html).toContain(previewLoginOtpProps.copy.title)
    expect(html).toContain(previewLoginOtpProps.copy.body)
    expect(html).toContain(previewLoginOtpProps.copy.expiresLine)
    expect(html).toContain('facade-content-slot')
    expect(html).toContain('/static/logo-email-on-light.svg')
  })

  test('render-transactional-emails entrypoints for host delivery', async () => {
    const payload = mockPayload()
    const expiresAt = new Date('2030-01-15T12:00:00.000Z')
    const base = {
      payload,
      options,
      to: 'user@example.com',
      appName: 'Test CMS',
    }

    const [invite, otp, reset, setPw] = await Promise.all([
      renderInvitationEmail({
        ...base,
        inviteUrl: 'https://cms.example.test/invite',
        expiresAt,
      }),
      renderLoginOtpEmail({
        ...base,
        otp: '445566',
        expiresInMinutes: 8,
      }),
      renderResetPasswordEmail({
        ...base,
        resetUrl: 'https://cms.example.test/reset#t=1',
        expiresAt,
      }),
      renderSetPasswordEmail({
        ...base,
        setPasswordUrl: 'https://cms.example.test/set-password#t=2',
        expiresAt,
      }),
    ])

    expect(invite.subject).toBe(iamEmailTranslationTrees.en.invitationSubject)
    expect(otp.subject).toBe(iamEmailTranslationTrees.en.loginOtpSubject)
    expect(reset.subject).toBe(iamEmailTranslationTrees.en.resetPasswordSubject)
    expect(setPw.subject).toBe(iamEmailTranslationTrees.en.setPasswordSubject)
    for (const mail of [invite, otp, reset, setPw]) {
      expect(mail.html.length).toBeGreaterThan(100)
      expect(mail.text.length).toBeGreaterThan(20)
    }
  })
})
