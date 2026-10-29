/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-no-forbidden-npm',
      severity: 'error',
      from: { path: '^src/core/' },
      to: {
        dependencyTypes: ['npm'],
        path: '^(payload|react|react-dom|next|better-auth|@better-auth/|pg|@payloadcms/)',
      },
    },
    {
      name: 'core-no-modules',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'core-no-adapters',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/adapters/' },
    },
    {
      name: 'core-no-plugin',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/plugin/' },
    },
    {
      name: 'adapters-no-ui',
      severity: 'error',
      from: { path: '^src/adapters/' },
      to: { path: '^src/modules/.*/ui/' },
    },
    {
      name: 'adapters-email-no-module-internals',
      comment:
        'adapters/email may import module-owned product templates (modules/*/emails/) only — not feature UI/services/domain.',
      severity: 'error',
      from: { path: '^src/adapters/email/' },
      to: {
        path: '^src/modules/',
        pathNot: ['^src/modules/auth/emails/', '^src/modules/invitations/emails/'],
      },
    },
    {
      name: 'module-emails-no-adapters-plugin',
      comment: 'Product email templates depend on shared presentation only — not adapters/plugin.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/emails/' },
      to: { path: '^src/(adapters|plugin)/' },
    },
    {
      name: 'exports-server-no-client-entry',
      severity: 'error',
      from: { path: '^src/exports/(index|rsc)\\.ts$' },
      to: { path: '^src/exports/client\\.ts$' },
    },
    {
      name: 'modules-no-cross-module-internals',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: [
          '^src/modules/$1/',
          '^src/modules/[^/]+/index\\.ts$',
          '^src/modules/[^/]+/ui/index\\.ts$',
        ],
      },
    },
    {
      name: 'shared-no-modules',
      comment:
        'shared/ must not import modules/ (placement rule). Exceptions: admin shell components that call rbac/access/admin-panel-user (canUseAdminShell); no DI — see ADR 0004.',
      severity: 'error',
      from: {
        path: '^src/shared/',
        pathNot: [
          '^src/shared/ui/admin/user-footer\\.tsx$',
          '^src/shared/ui/admin/admin-session-guard\\.tsx$',
        ],
      },
      to: { path: '^src/modules/' },
    },
    {
      name: 'auth-methods-google-not-email',
      comment: 'Auth method folders must not import each other (ADR 0004).',
      severity: 'error',
      from: { path: '^src/modules/auth/methods/google/' },
      to: { path: '^src/modules/auth/methods/email-and-password/' },
    },
    {
      name: 'auth-methods-email-not-google',
      comment: 'Auth method folders must not import each other (ADR 0004).',
      severity: 'error',
      from: { path: '^src/modules/auth/methods/email-and-password/' },
      to: { path: '^src/modules/auth/methods/google/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
}

export default config
