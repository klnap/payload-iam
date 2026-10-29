/** Pull test-friendly fields from IAM transactional email for dev terminal logs. */
export function extractDevMailActions(input: { subject?: string; html?: string; text?: string }): {
  otp?: string
  links?: string[]
} {
  const blob = [input.text, input.html, input.subject].filter(Boolean).join('\n')
  const links = [...blob.matchAll(/href="([^"]+)"/gi)]
    .map((m) => m[1]!.replace(/&amp;/g, '&'))
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
  const otpFromStrong = input.html?.match(/<strong>\s*(\d{4,10})\s*<\/strong>/i)?.[1]
  const otpFromText =
    input.text?.match(/(?:sign-in code|code|otp)[:\s]+(\d{4,10})/i)?.[1] ??
    blob.match(/\b(\d{6})\b/)?.[1]
  const otp = otpFromStrong ?? otpFromText
  return {
    otp,
    links: links.length ? [...new Set(links)] : undefined,
  }
}

export function formatDevMailLogLine(args: {
  to: string
  subject?: string
  otp?: string
  links?: string[]
}): string {
  const parts = [`[dev-mail] to=${args.to}`]
  if (args.subject) parts.push(`subject="${args.subject}"`)
  if (args.otp) parts.push(`otp=${args.otp}`)
  if (args.links?.length) parts.push(`link=${args.links[0]}`)
  return parts.join(' ')
}
