/**
 * Document policy for unauthenticated admin routes (login, invite, forgot, …).
 * Standalone — no Next.js `headers()` in the host app required.
 */
export default function GuestSecurityMeta() {
  return (
    <>
      <meta content='no-referrer' name='referrer' />
      <meta content='nosniff' httpEquiv='X-Content-Type-Options' />
    </>
  )
}
