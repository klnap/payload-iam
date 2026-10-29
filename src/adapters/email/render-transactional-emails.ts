import type { Payload } from 'payload'
import type { IamOptions } from '#iam/types/config'
import {
  renderInvitationEmailWithContext,
  renderLoginOtpEmailWithContext,
  renderResetPasswordEmailWithContext,
  renderSetPasswordEmailWithContext,
} from './render-iam-email'
import { resolveEmailRenderContext } from './resolve-email-render-context'

export async function renderInvitationEmail(args: {
  payload: Payload
  options: IamOptions
  to: string
  inviteUrl: string
  expiresAt: Date
  appName: string
}): Promise<{ html: string; text: string; subject: string }> {
  const ctx = await resolveEmailRenderContext({
    payload: args.payload,
    options: args.options,
    to: args.to,
    sendKind: 'invite',
    appName: args.appName,
  })
  return renderInvitationEmailWithContext({
    ctx,
    payload: args.payload,
    options: args.options,
    inviteUrl: args.inviteUrl,
    expiresAt: args.expiresAt,
  })
}

export async function renderLoginOtpEmail(args: {
  payload: Payload
  options: IamOptions
  to: string
  otp: string
  expiresInMinutes: number
  appName: string
}): Promise<{ html: string; text: string; subject: string }> {
  const ctx = await resolveEmailRenderContext({
    payload: args.payload,
    options: args.options,
    to: args.to,
    sendKind: 'otp',
    appName: args.appName,
  })
  return renderLoginOtpEmailWithContext({
    ctx,
    payload: args.payload,
    options: args.options,
    otp: args.otp,
    expiresInMinutes: args.expiresInMinutes,
  })
}

export async function renderResetPasswordEmail(args: {
  payload: Payload
  options: IamOptions
  to: string
  resetUrl: string
  expiresAt: Date
  appName: string
}): Promise<{ html: string; text: string; subject: string }> {
  const ctx = await resolveEmailRenderContext({
    payload: args.payload,
    options: args.options,
    to: args.to,
    sendKind: 'reset',
    appName: args.appName,
  })
  return renderResetPasswordEmailWithContext({
    ctx,
    payload: args.payload,
    options: args.options,
    resetUrl: args.resetUrl,
    expiresAt: args.expiresAt,
  })
}

export async function renderSetPasswordEmail(args: {
  payload: Payload
  options: IamOptions
  to: string
  setPasswordUrl: string
  expiresAt: Date
  appName: string
}): Promise<{ html: string; text: string; subject: string }> {
  const ctx = await resolveEmailRenderContext({
    payload: args.payload,
    options: args.options,
    to: args.to,
    sendKind: 'set-password',
    appName: args.appName,
  })
  return renderSetPasswordEmailWithContext({
    ctx,
    payload: args.payload,
    options: args.options,
    setPasswordUrl: args.setPasswordUrl,
    expiresAt: args.expiresAt,
  })
}
