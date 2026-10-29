import type { CollectionConfig, Config, Payload, Plugin } from 'payload'
import { deepMergeSimple } from 'payload/shared'
import { iamConsoleEmailAdapter } from '#iam/adapters/payload/console-email-adapter'
import type { ServicePrincipal } from '#iam/modules/auth/services/pre-payload-service-auth'
import { patchOwnedUsersCollection } from '#iam/modules/users/collections/patch-owned-users-collection'
import { adminViewMetaTitleEn } from '#iam/plugin/admin-view-meta-title'
import { iamPluginTranslations } from '#iam/shared/i18n/translations'
import { ACCESS_BASE_PATH } from '#iam/shared/paths/access-paths'
import {
  ACCOUNT_BASE_PATH,
  ACCOUNT_LINKED_PATH,
  ACCOUNT_SECURITY_PATH,
  ACCOUNT_SESSIONS_PATH,
} from '#iam/shared/paths/account-paths'
import { IAM_SESSION_ENDED_PATH, IAM_SIGN_OUT_PATH } from '#iam/shared/paths/auth-view-paths'
import { withAccessAdminNavLink } from '#iam/shared/ui/admin/after-nav-links'
import type { RbacRegisterTab } from '#iam/types/config'
import type { ResolvedRbacModules } from '#iam/types/modules'
import type { LoginFlags } from './auth/login-flags'
import { createRbacEndpoints } from './endpoints'
import { resolveUsersSlug } from './resolve-users-slug'
import { enabledModuleDescriptors, ownedCollectionSlugsFor } from './runtime/module-registry'
import {
  applyGlobalsAccess,
  applyHostCollectionsAccess,
  applyOwnedPackageCollections,
} from './wrap-config-access'

export type { LoginFlags } from './auth/login-flags'

export function createPayloadPlugin(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAuth: () => any
  getServicePrincipalFromHeaders?: (
    headers: Headers
  ) => ServicePrincipal | null | Promise<ServicePrincipal | null>
  loginFlags: LoginFlags
  users?: CollectionConfig
  register?: RbacRegisterTab[]
  modules: ResolvedRbacModules
  onReady: (payload: Payload, usersSlug: string) => Promise<void>
}): Plugin {
  return (incoming: Config): Config => {
    const usersSlug = resolveUsersSlug(incoming, args.users)
    let collections = [...(incoming.collections ?? [])]
    const collectionCtx = { register: args.register }
    for (const descriptor of enabledModuleDescriptors(args.modules)) {
      for (const col of descriptor.contributeCollections?.(collectionCtx) ?? []) {
        if (!collections.some((existing) => existing.slug === col.slug)) {
          collections.push(col)
        }
      }
    }

    const packageOwned = ownedCollectionSlugsFor(args.modules)
    packageOwned.add(usersSlug)

    const usersIdx = collections.findIndex((c) => c.slug === usersSlug)
    if (usersIdx >= 0 && args.modules.users) {
      collections[usersIdx] = patchOwnedUsersCollection(collections[usersIdx]!, {
        usersSlug,
        loginFlags: args.loginFlags,
        getAuth: args.getAuth,
        getServicePrincipalFromHeaders: args.getServicePrincipalFromHeaders,
      })
    }

    collections = applyOwnedPackageCollections(collections, packageOwned, usersSlug)
    collections = applyHostCollectionsAccess(collections, packageOwned)
    const globals = applyGlobalsAccess([...(incoming.globals ?? [])])

    const admin = { ...(incoming.admin ?? {}) }
    admin.routes = {
      ...(admin.routes ?? {}),
      // Stock `/reset/:token` bypasses custom views — use custom routes + hash flow.
      reset: '/__payload_rbac_reset_disabled__',
      logout: IAM_SIGN_OUT_PATH,
      inactivity: IAM_SESSION_ENDED_PATH,
      ...(args.loginFlags.forgotPassword ? { forgot: admin.routes?.forgot ?? '/forgot' } : {}),
    }
    admin.avatar = {
      Component: '@klnap/payload-iam/client#HeaderAccountHide',
    }
    const components = { ...(admin.components ?? {}) }
    const afterNav = [...(components.afterNav ?? [])]
    const stylesPath = '@klnap/payload-iam/client#AdminIamStyles'
    if (!afterNav.includes(stylesPath)) {
      afterNav.unshift(stylesPath)
    }
    const sessionGuardPath = '@klnap/payload-iam/client#AdminSessionGuard'
    if (!afterNav.includes(sessionGuardPath)) {
      afterNav.unshift(sessionGuardPath)
    }
    if (!afterNav.includes('@klnap/payload-iam/client#UserFooter')) {
      afterNav.push('@klnap/payload-iam/client#UserFooter')
    }
    components.afterNav = afterNav

    if (args.modules.users) {
      components.afterNavLinks = withAccessAdminNavLink(components.afterNavLinks ?? [])
    }

    components.views = {
      ...(components.views ?? {}),
      account: {
        Component: '@klnap/payload-iam/rsc#Account',
        path: ACCOUNT_BASE_PATH,
        exact: true,
        meta: {
          title: adminViewMetaTitleEn('iam:rbac:accountNav'),
        },
      },
      accountSecurity: {
        Component: '@klnap/payload-iam/rsc#AccountSecurity',
        path: ACCOUNT_SECURITY_PATH,
        exact: true,
        meta: {
          title: adminViewMetaTitleEn('iam:rbac:accountRouteTitleSecurity'),
        },
      },
      sessions: {
        Component: '@klnap/payload-iam/rsc#Sessions',
        path: ACCOUNT_SESSIONS_PATH,
        exact: true,
        meta: {
          title: adminViewMetaTitleEn('iam:rbac:accountRouteTitleSessions'),
        },
      },
      accountLinked: {
        Component: '@klnap/payload-iam/rsc#AccountLinked',
        path: ACCOUNT_LINKED_PATH,
        exact: true,
        meta: {
          title: adminViewMetaTitleEn('iam:rbac:accountRouteTitleLinked'),
        },
      },
      accountLoginMethodsAlias: {
        Component: '@klnap/payload-iam/rsc#AccountLinked',
        path: `${ACCOUNT_BASE_PATH}/login-methods`,
        exact: true,
        meta: {
          title: adminViewMetaTitleEn('iam:rbac:accountRouteTitleLinked'),
        },
      },
      ...(args.modules.users
        ? {
            access: {
              Component: '@klnap/payload-iam/rsc#AccessHub',
              path: ACCESS_BASE_PATH,
              meta: {
                title: adminViewMetaTitleEn('iam:rbac:accessNav'),
              },
            },
          }
        : {}),
      login: {
        Component: '@klnap/payload-iam/rsc#Login',
      },
      ...(args.loginFlags.forgotPassword
        ? {
            forgot: {
              Component: '@klnap/payload-iam/rsc#ForgotPassword',
            },
          }
        : {}),
      logout: {
        Component: '@klnap/payload-iam/rsc#Logout',
        path: IAM_SIGN_OUT_PATH,
        exact: true,
        meta: {
          title: adminViewMetaTitleEn('iam:rbac:adminViewTitleSignOut'),
        },
      },
      inactivity: {
        Component: '@klnap/payload-iam/rsc#LogoutInactivity',
        path: IAM_SESSION_ENDED_PATH,
        exact: true,
        meta: {
          title: adminViewMetaTitleEn('iam:rbac:adminViewTitleSessionEnded'),
        },
      },
      resetPassword: {
        Component: '@klnap/payload-iam/rsc#ResetPassword',
        path: '/reset-password',
        exact: true,
        meta: {
          title: adminViewMetaTitleEn('iam:rbac:adminViewTitleResetPassword'),
        },
      },
      setPassword: {
        Component: '@klnap/payload-iam/rsc#SetPassword',
        path: '/set-password',
        exact: true,
        meta: {
          title: adminViewMetaTitleEn('iam:rbac:adminViewTitleSetPassword'),
        },
      },
      resetToken: {
        Component: '@klnap/payload-iam/rsc#ResetPassword',
        path: '/reset/:token',
        exact: true,
        meta: {
          title: adminViewMetaTitleEn('iam:rbac:adminViewTitleResetPassword'),
        },
      },
      ...(args.modules.invitations
        ? {
            // Public (isCustomAdminView) — no session; path relative to routes.admin.
            inviteAccept: {
              Component: '@klnap/payload-iam/rsc#InviteAccept',
              path: '/invite/accept',
              exact: true,
              meta: {
                title: adminViewMetaTitleEn('iam:rbac:adminViewTitleInviteAccept'),
              },
            },
          }
        : {}),
    }
    admin.components = components
    if (!admin.user) admin.user = usersSlug

    const prevOnInit = incoming.onInit
    const endpoints = [
      ...(incoming.endpoints ?? []),
      ...createRbacEndpoints(args.modules, {
        forgotPassword: args.loginFlags.forgotPassword,
        usersSlug,
      }),
    ]

    const i18n = {
      ...incoming.i18n,
      translations: deepMergeSimple(iamPluginTranslations, incoming.i18n?.translations ?? {}),
    }

    const email = incoming.email ?? iamConsoleEmailAdapter

    return {
      ...incoming,
      collections,
      globals,
      admin,
      email,
      i18n,
      endpoints,
      custom: {
        ...(incoming.custom ?? {}),
        payloadIam: {
          login: args.loginFlags,
          register: args.register ?? [],
        },
      },
      onInit: async (payload) => {
        await args.onReady(payload, usersSlug)
        if (args.modules.bootstrap) {
          const { assertRootOrAllowBootstrap } = await import(
            '#iam/modules/bootstrap/services/bootstrap-root'
          )
          await assertRootOrAllowBootstrap(payload)
        }
        if (prevOnInit) await prevOnInit(payload)
      },
    }
  }
}
