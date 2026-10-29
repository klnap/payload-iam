import type { Payload } from 'payload'
import { logDevTransactionalEmail } from './log-dev-mail'

type EmailPayload = {
  to: string
  subject: string
  html: string
  text?: string
}

/** Uses Payload `sendEmail` so the active adapter (console, Resend, …) handles delivery and logging. */
export async function deliverPayloadEmail(
  getPayload: () => Promise<Payload>,
  message: EmailPayload
): Promise<void> {
  const payload = await getPayload()
  if (typeof payload.sendEmail !== 'function') {
    throw new Error('payload-iam: payload.sendEmail is not available — is Payload initialized?')
  }
  logDevTransactionalEmail(payload, message)
  try {
    await payload.sendEmail(message)
  } catch (err) {
    // Dev: OTP / reset links are already in the CMS terminal via `logDevTransactionalEmail`.
    // Do not fail IAM APIs when Resend sandbox rejects non-verified recipients.
    if (process.env.NODE_ENV !== 'production') {
      payload.logger.warn({
        msg: 'payload-iam: sendEmail failed after dev-mail log (ignored in non-production)',
        err: err instanceof Error ? err.message : String(err),
      })
      return
    }
    throw err
  }
}

export function emailAdapterName(payload: Payload): string | undefined {
  return (payload as Payload & { email?: { name?: string } }).email?.name
}
