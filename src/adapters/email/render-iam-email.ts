import { render } from '@react-email/render'
import type { Payload } from 'payload'
import { LoginOtpEmail } from '#iam/modules/auth/emails/login-otp-email'
import { ResetPasswordEmail } from '#iam/modules/auth/emails/reset-password-email'
import { SetPasswordEmail } from '#iam/modules/auth/emails/set-password-email'
import { InvitationEmail } from '#iam/modules/invitations/emails/invitation-email'
import type { IamOptions } from '#iam/types/config'
import type {
  EmailRenderContext,
  IamEmailKind,
  IamEmailRenderProps,
  IamEmailTemplateComponent,
  IamEmailTemplateRegistry,
  IamInvitationEmailData,
  IamLoginOtpEmailData,
  IamResetPasswordEmailData,
  IamSetPasswordEmailData,
} from '#iam/types/email'
import {
  buildInvitationEmailCopy,
  buildLoginOtpEmailCopy,
  buildResetPasswordEmailCopy,
  buildSetPasswordEmailCopy,
} from './build-email-copy'

function registryKey(kind: IamEmailKind): keyof IamEmailTemplateRegistry {
  switch (kind) {
    case 'invitation':
      return 'invitation'
    case 'login-otp':
      return 'loginOtp'
    case 'reset-password':
      return 'resetPassword'
    case 'set-password':
      return 'setPassword'
  }
}

async function resolveExtras<K extends IamEmailKind>(
  kind: K,
  payload: Payload,
  options: IamOptions,
  data: IamEmailRenderProps<K>['data']
): Promise<Record<string, unknown> | undefined> {
  const enrich = options.email?.enrichData
  if (!enrich) return undefined
  switch (kind) {
    case 'invitation':
      return enrich.invitation?.({ data: data as IamInvitationEmailData, payload })
    case 'login-otp':
      return enrich.loginOtp?.({ data: data as IamLoginOtpEmailData, payload })
    case 'reset-password':
      return enrich.resetPassword?.({ data: data as IamResetPasswordEmailData, payload })
    case 'set-password':
      return enrich.setPassword?.({ data: data as IamSetPasswordEmailData, payload })
  }
}

async function renderWithOverride<K extends IamEmailKind>(
  kind: K,
  _ctx: EmailRenderContext,
  props: IamEmailRenderProps<K>,
  options: IamOptions,
  _payload: Payload
): Promise<{ html: string; subject: string; text: string }> {
  const override = options.email?.templates?.[registryKey(kind)]
  const element = override
    ? (override as IamEmailTemplateComponent<K>)(props)
    : defaultElement(kind, props)

  const html = await render(element)
  const copy = props.copy as { subject: string }
  const text = plainTextForKind(kind, props)
  return { html, subject: copy.subject, text }
}

function defaultElement<K extends IamEmailKind>(kind: K, props: IamEmailRenderProps<K>) {
  switch (kind) {
    case 'invitation':
      return InvitationEmail(props as IamEmailRenderProps<'invitation'>)
    case 'login-otp':
      return LoginOtpEmail(props as IamEmailRenderProps<'login-otp'>)
    case 'reset-password':
      return ResetPasswordEmail(props as IamEmailRenderProps<'reset-password'>)
    case 'set-password':
      return SetPasswordEmail(props as IamEmailRenderProps<'set-password'>)
  }
}

function plainTextForKind<K extends IamEmailKind>(kind: K, props: IamEmailRenderProps<K>): string {
  const { copy, data, brand } = props
  const lines: string[] = [copy.title, '', copy.body]
  switch (kind) {
    case 'invitation': {
      const d = data as IamInvitationEmailData
      const c = copy as IamEmailRenderProps<'invitation'>['copy']
      lines.push('', `${c.cta}: ${d.inviteUrl}`, c.expiresLine)
      break
    }
    case 'login-otp': {
      const d = data as IamLoginOtpEmailData
      const c = copy as IamEmailRenderProps<'login-otp'>['copy']
      lines.push('', c.otpLabel, d.otp, '', c.expiresLine)
      break
    }
    case 'reset-password': {
      const d = data as IamResetPasswordEmailData
      const c = copy as IamEmailRenderProps<'reset-password'>['copy']
      lines.push('', `${c.cta}: ${d.resetUrl}`, c.expiresLine)
      break
    }
    case 'set-password': {
      const d = data as IamSetPasswordEmailData
      const c = copy as IamEmailRenderProps<'set-password'>['copy']
      lines.push('', `${c.cta}: ${d.setPasswordUrl}`, c.expiresLine)
      break
    }
  }
  if ('footerLine' in copy && copy.footerLine) {
    lines.push('', copy.footerLine)
  }
  if (brand.kind === 'image' && brand.alt) {
    lines.unshift(brand.alt)
  }
  return lines.join('\n')
}

export async function renderInvitationEmailWithContext(args: {
  ctx: EmailRenderContext
  payload: Payload
  options: IamOptions
  inviteUrl: string
  expiresAt: Date
}): Promise<{ html: string; text: string; subject: string }> {
  const expiresAtIso = args.expiresAt.toISOString()
  const data: IamInvitationEmailData = {
    inviteUrl: args.inviteUrl,
    expiresAtIso,
    appName: args.ctx.appName,
  }
  const copy = buildInvitationEmailCopy(args.ctx, expiresAtIso)
  const extras = await resolveExtras('invitation', args.payload, args.options, data)
  const props: IamEmailRenderProps<'invitation'> = {
    data,
    copy,
    brand: args.ctx.brand,
    theme: args.ctx.theme,
    fonts: args.ctx.fonts,
    extras,
  }
  return renderWithOverride('invitation', args.ctx, props, args.options, args.payload)
}

export async function renderLoginOtpEmailWithContext(args: {
  ctx: EmailRenderContext
  payload: Payload
  options: IamOptions
  otp: string
  expiresInMinutes: number
}): Promise<{ html: string; text: string; subject: string }> {
  const data: IamLoginOtpEmailData = {
    otp: args.otp,
    expiresInMinutes: args.expiresInMinutes,
    appName: args.ctx.appName,
  }
  const copy = buildLoginOtpEmailCopy(args.ctx, args.expiresInMinutes)
  const extras = await resolveExtras('login-otp', args.payload, args.options, data)
  const props: IamEmailRenderProps<'login-otp'> = {
    data,
    copy,
    brand: args.ctx.brand,
    theme: args.ctx.theme,
    fonts: args.ctx.fonts,
    extras,
  }
  return renderWithOverride('login-otp', args.ctx, props, args.options, args.payload)
}

export async function renderResetPasswordEmailWithContext(args: {
  ctx: EmailRenderContext
  payload: Payload
  options: IamOptions
  resetUrl: string
  expiresAt: Date
}): Promise<{ html: string; text: string; subject: string }> {
  const expiresAtIso = args.expiresAt.toISOString()
  const data: IamResetPasswordEmailData = {
    resetUrl: args.resetUrl,
    expiresAtIso,
    appName: args.ctx.appName,
  }
  const copy = buildResetPasswordEmailCopy(args.ctx, expiresAtIso)
  const extras = await resolveExtras('reset-password', args.payload, args.options, data)
  const props: IamEmailRenderProps<'reset-password'> = {
    data,
    copy,
    brand: args.ctx.brand,
    theme: args.ctx.theme,
    fonts: args.ctx.fonts,
    extras,
  }
  return renderWithOverride('reset-password', args.ctx, props, args.options, args.payload)
}

export async function renderSetPasswordEmailWithContext(args: {
  ctx: EmailRenderContext
  payload: Payload
  options: IamOptions
  setPasswordUrl: string
  expiresAt: Date
}): Promise<{ html: string; text: string; subject: string }> {
  const expiresAtIso = args.expiresAt.toISOString()
  const data: IamSetPasswordEmailData = {
    setPasswordUrl: args.setPasswordUrl,
    expiresAtIso,
    appName: args.ctx.appName,
  }
  const copy = buildSetPasswordEmailCopy(args.ctx, expiresAtIso)
  const extras = await resolveExtras('set-password', args.payload, args.options, data)
  const props: IamEmailRenderProps<'set-password'> = {
    data,
    copy,
    brand: args.ctx.brand,
    theme: args.ctx.theme,
    fonts: args.ctx.fonts,
    extras,
  }
  return renderWithOverride('set-password', args.ctx, props, args.options, args.payload)
}
