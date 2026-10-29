/** IAM authentication mount (sign-in, OAuth, sign-out). CMS: `app/api/iam/auth/[...all]`. */
export const IAM_AUTH_API_BASE_PATH = '/api/iam/auth'

export function iamAuthApiUrl(relativePath: string): string {
  const p = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return `${IAM_AUTH_API_BASE_PATH}${p}`
}
