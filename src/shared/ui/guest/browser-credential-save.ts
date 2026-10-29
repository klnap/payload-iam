export function loginUrl(adminRoute: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${adminRoute === '/' ? '/login' : `${adminRoute}/login`}`
}

export function downloadCredentials(args: { adminRoute: string; email: string; password: string }) {
  const body = [
    'Admin panel credentials',
    `URL: ${loginUrl(args.adminRoute)}`,
    `Email: ${args.email}`,
    `Password: ${args.password}`,
    '',
    'Store this file securely and delete it after saving the password.',
  ].join('\n')
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = 'credentials.txt'
  a.click()
  URL.revokeObjectURL(href)
}

export async function offerBrowserPasswordSave(email: string, password: string) {
  try {
    const Cred = (
      window as unknown as {
        PasswordCredential?: new (data: { id: string; password: string }) => Credential
      }
    ).PasswordCredential
    if (!Cred || !navigator.credentials?.store) return
    await navigator.credentials.store(new Cred({ id: email, password }))
  } catch {
    // Browser declined / unsupported — fine.
  }
}
