export type PostconditionFailure = {
  code: string
  message: string
}

export function assertPostcondition(ok: boolean, failure: PostconditionFailure): asserts ok {
  if (!ok) {
    const err = new Error(failure.message)
    ;(err as Error & { code: string }).code = failure.code
    throw err
  }
}

/** BA resetPassword returns status:true even if createAccount null — must verify durable write */
export async function assertCredentialAccountExists(
  findCredential: (userId: string) => Promise<unknown | null>,
  userId: string
): Promise<void> {
  const row = await findCredential(userId)
  assertPostcondition(row != null, {
    code: 'CREDENTIAL_POSTCONDITION',
    message: 'credential account missing after password write',
  })
}
