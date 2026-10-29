import { pathToFileURL } from 'node:url'
import { ROOT_ROLE_NAME } from '#iam/modules/bootstrap/config/root'
import { bootstrapRoot } from '#iam/modules/bootstrap/services/bootstrap-root'
import { ensureRootRole } from '#iam/modules/bootstrap/services/ensure-root-role'
import { hasRoot } from '#iam/modules/bootstrap/services/has-root'
import { resolvePayloadConfigPath } from './resolve-payload-config-path'

export type CreateRootCommandOptions = {
  config?: string
  email?: string
  password?: string
  fullName?: string
}

/** Exit code for process. Sets PAYLOAD_RBAC_BOOTSTRAP for production bootstrap gate. */
export async function runCreateRootCommand(options: CreateRootCommandOptions): Promise<number> {
  process.env.PAYLOAD_RBAC_BOOTSTRAP = '1'

  const configPath = resolvePayloadConfigPath(options.config)
  const { getPayload } = await import('payload')
  const mod = await import(pathToFileURL(configPath).href)
  const config = mod.default
  const payload = await getPayload({ config })

  const email = options.email?.trim()
  const password = options.password

  if (email) {
    if (await hasRoot(payload)) {
      console.log('Root Admin already exists — noop')
      return 0
    }
    const result = await bootstrapRoot(payload, {
      email,
      ...(password ? { password } : {}),
      fullName: options.fullName,
    })
    console.log(`${ROOT_ROLE_NAME}: role=${result.roleId} user=${result.userId} (${email})`)
    if (result.generatedPassword) {
      console.log('')
      console.log('Generated password (save now — shown once):')
      console.log(result.generatedPassword)
    }
    return 0
  }

  if (password) {
    throw new Error('pass --email with --password (or omit --password to auto-generate)')
  }

  const role = await ensureRootRole(payload)
  const action = role.created ? 'created' : 'exists'
  console.log(`${ROOT_ROLE_NAME}: ${action} id=${role.id}`)
  if (!(await hasRoot(payload))) {
    console.warn(
      'Role exists but no user assigned — pass --email (optional --password) or use the login bootstrap form'
    )
  }
  return 0
}
