import type { EmailAdapter, Payload } from 'payload'
import { extractDevMailActions, formatDevMailLogLine } from './dev-mail-log'

function stringifyTo(message: { to?: unknown }): string {
  const to = message.to
  if (typeof to === 'string') return to
  if (Array.isArray(to)) {
    return to
      .map((entry) => {
        if (typeof entry === 'string') return entry
        if (entry && typeof entry === 'object' && 'address' in entry) {
          return String((entry as { address?: string }).address ?? '')
        }
        return ''
      })
      .filter(Boolean)
      .join(', ')
  }
  if (to && typeof to === 'object' && 'address' in to) {
    return String((to as { address?: string }).address ?? '')
  }
  return ''
}

/**
 * Dev / no-Resend: log OTP and action links in the CMS terminal (`[dev-mail]`).
 * Prefer this over Payload’s built-in console adapter (to + subject only).
 */
export const iamConsoleEmailAdapter: EmailAdapter = ({ payload }: { payload: Payload }) => ({
  name: 'console',
  defaultFromAddress: 'dev@localhost',
  defaultFromName: 'Stolbek IAM',
  sendEmail: async (message) => {
    const to = stringifyTo({ to: message.to })
    const html = typeof message.html === 'string' ? message.html : undefined
    const text = typeof message.text === 'string' ? message.text : undefined
    const { otp, links } = extractDevMailActions({
      subject: message.subject,
      html,
      text,
    })
    const devMail = formatDevMailLogLine({
      to,
      subject: message.subject,
      otp,
      links,
    })
    payload.logger.info(devMail)
    payload.logger.info({
      msg: devMail,
      to,
      subject: message.subject,
      otp,
      links,
      html,
      text,
    })
  },
})
