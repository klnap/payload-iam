import type { Payload } from 'payload'
import { extractDevMailActions, formatDevMailLogLine } from './dev-mail-log'

/** Always log OTP / links in dev terminals (even when Resend adapter is active). */
export function logDevTransactionalEmail(
  payload: Payload,
  message: { to: string; subject: string; html: string; text?: string }
): void {
  if (process.env.NODE_ENV === 'production') return
  const { otp, links } = extractDevMailActions({
    subject: message.subject,
    html: message.html,
    text: message.text,
  })
  const devMail = formatDevMailLogLine({
    to: message.to,
    subject: message.subject,
    otp,
    links,
  })
  payload.logger.info(devMail)
  payload.logger.info({
    msg: devMail,
    to: message.to,
    subject: message.subject,
    otp,
    links,
  })
}
