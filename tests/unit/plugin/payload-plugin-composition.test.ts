import { describe, expect, test } from 'bun:test'
import type { Config, Endpoint } from 'payload'
import { iam } from '../../../src/plugin/runtime/create-runtime'
import { IAM_API_PATH } from '../../../src/shared/paths/iam-api-paths'
import type { RbacAuthMethods } from '../../../src/types/config'
import type { RbacModulesToggle } from '../../../src/types/modules'

const TEST_SECRET = 's'.repeat(32)

const HOST_COLLECTIONS = [
  { slug: 'users', fields: [{ name: 'email', type: 'email' as const }] },
  { slug: 'posts', fields: [{ name: 'title', type: 'text' as const }] },
] satisfies Config['collections']

function composeWithIam(modules?: RbacModulesToggle, methods?: RbacAuthMethods): Config {
  const options = {
    secret: TEST_SECRET,
    methods: methods ?? { emailAndPassword: { enabled: true } },
    ...(modules === undefined ? {} : { modules }),
  }
  const plugin = iam(options)
  const incoming = {
    collections: [...HOST_COLLECTIONS],
    admin: { user: 'users' },
  } as Config
  const result = plugin(incoming)
  if (result instanceof Promise) {
    throw new Error('payload plugin composition test expected synchronous plugin')
  }
  return result
}

function collectPayloadRbacPaths(value: unknown, out: Set<string>): void {
  if (typeof value === 'string' && value.startsWith('@klnap/payload-iam/')) {
    out.add(value)
  } else if (Array.isArray(value)) {
    for (const item of value) collectPayloadRbacPaths(item, out)
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectPayloadRbacPaths(v, out)
  }
}

function iamPluginEndpoints(config: Config): Array<{ method: string; path: string }> {
  return (config.endpoints ?? [])
    .filter((e): e is Endpoint => typeof e.path === 'string' && typeof e.method === 'string')
    .filter((e) => e.path.startsWith('/iam/'))
    .map((e) => ({ method: e.method.toLowerCase(), path: e.path }))
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
}

const DEFAULT_IAM_ENDPOINTS = [
  { method: 'post', path: IAM_API_PATH.account.changePassword },
  { method: 'post', path: IAM_API_PATH.account.link.password },
  { method: 'post', path: IAM_API_PATH.account.link.passwordReset },
  { method: 'post', path: IAM_API_PATH.account.unlink.google },
  { method: 'post', path: IAM_API_PATH.bootstrap.root },
  { method: 'post', path: IAM_API_PATH.invitations.invite },
  { method: 'post', path: IAM_API_PATH.invitations.resend },
  { method: 'post', path: IAM_API_PATH.invitations.revoke },
  { method: 'get', path: IAM_API_PATH.sessions.list },
  { method: 'post', path: IAM_API_PATH.sessions.revoke },
  { method: 'post', path: IAM_API_PATH.users.requestPasswordEmail },
  { method: 'post', path: IAM_API_PATH.users.sendPasswordReset },
  { method: 'get', path: IAM_API_PATH.users.sessions },
  { method: 'post', path: IAM_API_PATH.users.transferRoot },
]

const DEFAULT_OWNED_COLLECTION_SLUGS = ['invitations', 'roles']

const DEFAULT_COMPONENT_PATHS = [
  '@klnap/payload-iam/client#AccessNavLink',
  '@klnap/payload-iam/client#AdminIamStyles',
  '@klnap/payload-iam/client#AdminSessionGuard',
  '@klnap/payload-iam/client#HeaderAccountHide',
  '@klnap/payload-iam/client#InvitationExpiresAtField',
  '@klnap/payload-iam/client#InvitationInviteLinkField',
  '@klnap/payload-iam/client#InvitationRenewField',
  '@klnap/payload-iam/client#InvitationRolesField',
  '@klnap/payload-iam/client#PermissionsAuth',
  '@klnap/payload-iam/client#PermissionsCollections',
  '@klnap/payload-iam/client#PermissionsGlobals',
  '@klnap/payload-iam/client#RoleUsersList',
  '@klnap/payload-iam/client#SendResetPasswordField',
  '@klnap/payload-iam/client#TransferRootField',
  '@klnap/payload-iam/client#UserAuthInsightsField',
  '@klnap/payload-iam/client#UserFooter',
  '@klnap/payload-iam/client#UserIdentityField',
  '@klnap/payload-iam/client#UserSessionsField',
  '@klnap/payload-iam/rsc#AccessHub',
  '@klnap/payload-iam/rsc#AccessListTabs',
  '@klnap/payload-iam/rsc#Account',
  '@klnap/payload-iam/rsc#AccountLinked',
  '@klnap/payload-iam/rsc#AccountSecurity',
  '@klnap/payload-iam/rsc#ForgotPassword',
  '@klnap/payload-iam/rsc#InviteAccept',
  '@klnap/payload-iam/rsc#Login',
  '@klnap/payload-iam/rsc#Logout',
  '@klnap/payload-iam/rsc#LogoutInactivity',
  '@klnap/payload-iam/rsc#ResetPassword',
  '@klnap/payload-iam/rsc#RoleUsersCell',
  '@klnap/payload-iam/rsc#RolesListCell',
  '@klnap/payload-iam/rsc#Sessions',
  '@klnap/payload-iam/rsc#SetPassword',
  '@klnap/payload-iam/rsc#UserAvatarCell',
]

describe('payload plugin composition (iam() without modules key)', () => {
  test('adds owned collections roles and invitations', () => {
    const config = composeWithIam()
    const slugs = (config.collections ?? []).map((c) => c.slug).sort()
    for (const slug of DEFAULT_OWNED_COLLECTION_SLUGS) {
      expect(slugs).toContain(slug)
    }
    expect(slugs).toContain('users')
    expect(slugs).toContain('posts')
  })

  test('access collections are not in default admin nav groups', () => {
    const config = composeWithIam()
    for (const slug of ['users', 'roles', 'invitations'] as const) {
      expect(config.collections?.find((c) => c.slug === slug)?.admin?.group).toBe(false)
    }
  })

  test('merges IAM translations into Payload i18n (host overrides)', () => {
    const hostTranslations = { en: { custom: { key: 'value' } } }
    const incoming = {
      collections: [...HOST_COLLECTIONS],
      admin: { user: 'users' },
      i18n: { translations: hostTranslations },
    } as Config
    const result = iam({
      secret: TEST_SECRET,
      methods: { emailAndPassword: { enabled: true } },
    })(incoming)
    if (result instanceof Promise) {
      throw new Error('expected sync plugin')
    }
    expect(result.i18n?.translations).not.toBe(hostTranslations)
    expect(result.i18n?.translations?.en?.custom?.key).toBe('value')
    expect(result.i18n?.translations?.en?.iam).toBeDefined()
  })

  test('defaults to IAM console email adapter when host omits config.email', () => {
    const result = composeWithIam()
    expect(result.email).toBeDefined()
  })

  test('registers /access hub view and sidebar link', () => {
    const config = composeWithIam()
    const views = config.admin?.components?.views as Record<string, { path?: string }>
    expect(views?.access?.path).toBe('/access')
    const links = config.admin?.components?.afterNavLinks ?? []
    expect(links).toContain('@klnap/payload-iam/client#AccessNavLink')
    expect(links[links.length - 1]).toBe('@klnap/payload-iam/client#AccessNavLink')
  })

  test('registers RBAC HTTP endpoints', () => {
    const keys = iamPluginEndpoints(composeWithIam()).map((e) => `${e.method} ${e.path}`)
    const expected = DEFAULT_IAM_ENDPOINTS.map((e) => `${e.method} ${e.path}`)
    expect(new Set(keys)).toEqual(new Set(expected))
    expect(keys.length).toBe(expected.length)
  })

  test('wires Better Auth strategy on users collection', () => {
    const users = composeWithIam().collections?.find((c) => c.slug === 'users')
    expect(users?.auth).toMatchObject({
      disableLocalStrategy: true,
      useSessions: false,
      useAPIKey: false,
      verify: false,
    })
    const auth = users?.auth
    expect(auth && typeof auth === 'object' && 'strategies' in auth).toBe(true)
    const strategies = (auth as { strategies?: unknown[] }).strategies
    expect(Array.isArray(strategies)).toBe(true)
    expect(strategies?.length).toBe(1)
  })

  test('users edit uses native tabs with identity inside Account tab only', () => {
    const users = composeWithIam().collections?.find((c) => c.slug === 'users')
    const fields = users?.fields ?? []
    expect(fields.some((f) => 'name' in f && f.name === 'identity')).toBe(false)
    const tabs = fields.find(
      (f) => 'type' in f && f.type === 'tabs' && f.admin?.className === 'iam-user-admin-tabs'
    )
    expect(tabs).toBeDefined()
    const account = tabs?.tabs?.[0]
    expect(typeof account?.label).toBe('function')
    expect(account?.fields?.some((f) => 'name' in f && f.name === 'identity')).toBe(true)
    expect(account?.fields?.some((f) => 'name' in f && f.name === 'roles')).toBe(false)
    expect(account?.fields?.some((f) => 'name' in f && f.name === 'isActive')).toBe(false)
    const roles = fields.find((f) => 'name' in f && f.name === 'roles')
    expect(roles?.admin?.position).toBe('sidebar')
    const tabsField = fields.find(
      (f) => 'type' in f && f.type === 'tabs' && f.admin?.className === 'iam-user-admin-tabs'
    )
    const security = tabsField?.tabs?.find((tab) =>
      tab.fields?.some((f) => 'name' in f && f.name === 'authAccountInsightsUi')
    )
    expect(typeof security?.label).toBe('function')
    expect(security?.fields?.some((f) => 'name' in f && f.name === 'authAccountInsightsUi')).toBe(
      true
    )
  })

  test('users collection has provisioning and role hooks', () => {
    const users = composeWithIam().collections?.find((c) => c.slug === 'users')
    const beforeChange = users?.hooks?.beforeChange
    const beforeDelete = users?.hooks?.beforeDelete
    expect(
      Array.isArray(beforeChange) ? beforeChange.length : beforeChange ? 1 : 0
    ).toBeGreaterThan(0)
    expect(
      Array.isArray(beforeDelete) ? beforeDelete.length : beforeDelete ? 1 : 0
    ).toBeGreaterThan(0)
  })

  test('admin component path strings match default snapshot', () => {
    const config = composeWithIam()
    const paths = new Set<string>()
    collectPayloadRbacPaths(config, paths)
    expect([...paths].sort()).toEqual(DEFAULT_COMPONENT_PATHS)
  })

  test('exposes login flags on custom.payloadIam', () => {
    const custom = composeWithIam().custom as { payloadIam?: { login?: unknown } }
    expect(custom.payloadIam?.login).toEqual({
      emailAndPassword: true,
      google: false,
      loginOtp: false,
      forgotPassword: true,
      length: 6,
    })
  })
})

describe('payload plugin composition (forgot password disabled)', () => {
  test('omits forgot view, send-reset endpoint, and sidebar field', () => {
    const config = composeWithIam(undefined, {
      emailAndPassword: { enabled: true, forgotPassword: { enabled: false } },
    })
    const views = config.admin?.components?.views as Record<string, unknown> | undefined
    expect(views?.forgot).toBeUndefined()
    const paths = iamPluginEndpoints(config).map((e) => e.path)
    expect(paths).not.toContain(IAM_API_PATH.users.sendPasswordReset)
    expect(paths).not.toContain(IAM_API_PATH.users.requestPasswordEmail)
    expect(paths).not.toContain(IAM_API_PATH.account.link.passwordReset)
    const routes = config.admin?.routes as Record<string, string> | undefined
    expect(routes?.forgot).toBeUndefined()
    const componentPaths = new Set<string>()
    collectPayloadRbacPaths(config, componentPaths)
    expect(componentPaths.has('@klnap/payload-iam/rsc#ForgotPassword')).toBe(false)
    const users = config.collections?.find((c) => c.slug === 'users')
    const fieldNames = (users?.fields ?? []).flatMap((f) =>
      'name' in f && typeof (f as { name?: unknown }).name === 'string'
        ? [(f as { name: string }).name]
        : []
    )
    expect(fieldNames).not.toContain('sendPasswordReset')
    const custom = config.custom as { payloadIam?: { login?: { forgotPassword?: boolean } } }
    expect(custom.payloadIam?.login?.forgotPassword).toBe(false)
  })

  test('still registers invite endpoints but no password-email routes when invitations on', () => {
    const config = composeWithIam(undefined, {
      emailAndPassword: { enabled: true, forgotPassword: { enabled: false } },
    })
    const paths = iamPluginEndpoints(config).map((e) => e.path)
    expect(paths).toContain(IAM_API_PATH.invitations.invite)
    expect(paths).not.toContain(IAM_API_PATH.users.requestPasswordEmail)
    expect(paths).not.toContain(IAM_API_PATH.users.sendPasswordReset)
    expect(paths).not.toContain(IAM_API_PATH.account.link.passwordReset)
  })
})

describe('payload plugin composition (modules.invitations false)', () => {
  test('omits invitations collection and invite endpoints', () => {
    const config = composeWithIam({ invitations: false })
    const slugs = (config.collections ?? []).map((c) => c.slug)
    expect(slugs).not.toContain('invitations')
    expect(slugs).toContain('roles')
    expect(iamPluginEndpoints(config)).toEqual([
      { method: 'post', path: IAM_API_PATH.account.changePassword },
      { method: 'post', path: IAM_API_PATH.account.link.password },
      { method: 'post', path: IAM_API_PATH.account.link.passwordReset },
      { method: 'post', path: IAM_API_PATH.account.unlink.google },
      { method: 'post', path: IAM_API_PATH.bootstrap.root },
      { method: 'get', path: IAM_API_PATH.sessions.list },
      { method: 'post', path: IAM_API_PATH.sessions.revoke },
      { method: 'post', path: IAM_API_PATH.users.requestPasswordEmail },
      { method: 'post', path: IAM_API_PATH.users.sendPasswordReset },
      { method: 'get', path: IAM_API_PATH.users.sessions },
      { method: 'post', path: IAM_API_PATH.users.transferRoot },
    ])
  })

  test('no invitation collection field components when invitations disabled', () => {
    const config = composeWithIam({ invitations: false })
    const paths = new Set<string>()
    collectPayloadRbacPaths(config, paths)
    const clientInvitationFields = [...paths].filter((p) => p.includes('client#Invitation'))
    expect(clientInvitationFields).toEqual([])
  })

  test('does not register inviteAccept admin view', () => {
    const config = composeWithIam({ invitations: false })
    const views = config.admin?.components?.views as Record<string, unknown> | undefined
    expect(views?.inviteAccept).toBeUndefined()
    const paths = new Set<string>()
    collectPayloadRbacPaths(config, paths)
    expect(paths.has('@klnap/payload-iam/rsc#InviteAccept')).toBe(false)
  })

  test('roles and users still use shared access chrome without invitations collection', () => {
    const config = composeWithIam({ invitations: false })
    const paths = new Set<string>()
    collectPayloadRbacPaths(config, paths)
    expect(paths.has('@klnap/payload-iam/rsc#AccessListTabs')).toBe(true)
    expect(paths.has('@klnap/payload-iam/rsc#RolesListCell')).toBe(true)
    const roles = config.collections?.find((c) => c.slug === 'roles')
    expect(roles).toBeDefined()
    const users = config.collections?.find((c) => c.slug === 'users')
    expect(users?.admin?.components?.Description).toBe('@klnap/payload-iam/rsc#AccessListTabs')
  })
})
