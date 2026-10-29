import type {
  EmailRenderContext,
  IamEmailCopyByKind,
  IamEmailKind,
  IamInvitationEmailCopy,
  IamLoginOtpEmailCopy,
  IamResetPasswordEmailCopy,
  IamSetPasswordEmailCopy,
} from '#iam/types/email'
import { formatExpiresAt } from './resolve-email-render-context'

function footerLine(ctx: EmailRenderContext): string | undefined {
  return ctx.theme.footer?.line ?? ctx.t('iam:email:footerLine')
}

export function buildInvitationEmailCopy(
  ctx: EmailRenderContext,
  expiresAtIso: string
): IamInvitationEmailCopy {
  const expiresAt = formatExpiresAt(expiresAtIso, ctx.locale)
  return {
    subject: ctx.t('iam:email:invitationSubject'),
    preview: ctx.t('iam:email:invitationPreview'),
    title: ctx.t('iam:email:invitationTitle'),
    body: ctx.t('iam:email:invitationBody'),
    cta: ctx.t('iam:email:invitationCta'),
    expiresLine: ctx.t('iam:email:invitationExpires', { expiresAt }),
    footerLine: footerLine(ctx),
  }
}

export function buildLoginOtpEmailCopy(
  ctx: EmailRenderContext,
  expiresInMinutes: number
): IamLoginOtpEmailCopy {
  return {
    subject: ctx.t('iam:email:loginOtpSubject'),
    preview: ctx.t('iam:email:loginOtpPreview', { minutes: expiresInMinutes }),
    title: ctx.t('iam:email:loginOtpTitle'),
    body: ctx.t('iam:email:loginOtpBody'),
    otpLabel: ctx.t('iam:email:loginOtpLabel'),
    otpDivider: ctx.t('iam:email:loginOtpDivider'),
    signInCta: ctx.t('iam:email:loginOtpSignInCta'),
    expiresLine: ctx.t('iam:email:loginOtpExpires', { minutes: expiresInMinutes }),
    footerLine: footerLine(ctx),
  }
}

export function buildResetPasswordEmailCopy(
  ctx: EmailRenderContext,
  expiresAtIso: string
): IamResetPasswordEmailCopy {
  const expiresAt = formatExpiresAt(expiresAtIso, ctx.locale)
  return {
    subject: ctx.t('iam:email:resetPasswordSubject'),
    preview: ctx.t('iam:email:resetPasswordPreview'),
    title: ctx.t('iam:email:resetPasswordTitle'),
    body: ctx.t('iam:email:resetPasswordBody'),
    cta: ctx.t('iam:email:resetPasswordCta'),
    expiresLine: ctx.t('iam:email:resetPasswordExpires', { expiresAt }),
    footerLine: footerLine(ctx),
  }
}

export function buildSetPasswordEmailCopy(
  ctx: EmailRenderContext,
  expiresAtIso: string
): IamSetPasswordEmailCopy {
  const expiresAt = formatExpiresAt(expiresAtIso, ctx.locale)
  return {
    subject: ctx.t('iam:email:setPasswordSubject'),
    preview: ctx.t('iam:email:setPasswordPreview'),
    title: ctx.t('iam:email:setPasswordTitle'),
    body: ctx.t('iam:email:setPasswordBody'),
    cta: ctx.t('iam:email:setPasswordCta'),
    expiresLine: ctx.t('iam:email:setPasswordExpires', { expiresAt }),
    footerLine: footerLine(ctx),
  }
}

export function buildEmailCopyForKind<K extends IamEmailKind>(
  kind: K,
  ctx: EmailRenderContext,
  args: K extends 'invitation'
    ? { expiresAtIso: string }
    : K extends 'login-otp'
      ? { expiresInMinutes: number }
      : { expiresAtIso: string }
): IamEmailCopyByKind[K] {
  switch (kind) {
    case 'invitation':
      return buildInvitationEmailCopy(
        ctx,
        (args as { expiresAtIso: string }).expiresAtIso
      ) as IamEmailCopyByKind[K]
    case 'login-otp':
      return buildLoginOtpEmailCopy(
        ctx,
        (args as { expiresInMinutes: number }).expiresInMinutes
      ) as IamEmailCopyByKind[K]
    case 'reset-password':
      return buildResetPasswordEmailCopy(
        ctx,
        (args as { expiresAtIso: string }).expiresAtIso
      ) as IamEmailCopyByKind[K]
    case 'set-password':
      return buildSetPasswordEmailCopy(
        ctx,
        (args as { expiresAtIso: string }).expiresAtIso
      ) as IamEmailCopyByKind[K]
    default: {
      const _exhaustive: never = kind
      throw new Error(`Unknown email kind: ${_exhaustive}`)
    }
  }
}
