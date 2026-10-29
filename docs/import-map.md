# Admin import map

Custom admin views and fields reference **`@klnap/payload-iam/rsc#…`** and **`@klnap/payload-iam/client#…`**. Payload resolves these through your import map (e.g. `app/(payload)/admin/importMap.js`).

## Discovering names

- Grep this package for `@klnap/payload-iam/`
- Run **`bun run check:exports`** — symbols in [`scripts/exports-snapshot.json`](../scripts/exports-snapshot.json)
- Optional: **`bunx payload generate:importmap`** if your template supports it ([ADR 0002](./adr/0002-entry-points.md))

Map each `#Name` to the matching export from [`src/exports/rsc.ts`](../src/exports/rsc.ts) and [`src/exports/client.ts`](../src/exports/client.ts). After upgrades, re-diff against `exports-snapshot.json`.

## Required mappings

Referenced from [`payload-plugin.ts`](../src/plugin/payload-plugin.ts) and collection configs:

| Import map key | Export |
| -------------- | ------ |
| `@klnap/payload-iam/rsc#Login` | `./Login` from `@klnap/payload-iam/rsc` |
| `@klnap/payload-iam/rsc#Logout` | `./Logout` |
| `@klnap/payload-iam/rsc#LogoutInactivity` | `./LogoutInactivity` |
| `@klnap/payload-iam/rsc#ForgotPassword` | *if forgot password enabled* |
| `@klnap/payload-iam/rsc#ResetPassword` | `./ResetPassword` |
| `@klnap/payload-iam/rsc#SetPassword` | `./SetPassword` |
| `@klnap/payload-iam/rsc#Account` | `./Account` |
| `@klnap/payload-iam/rsc#AccountSecurity` | `./AccountSecurity` |
| `@klnap/payload-iam/rsc#Sessions` | `./Sessions` |
| `@klnap/payload-iam/rsc#AccountLinked` | `./AccountLinked` |
| `@klnap/payload-iam/rsc#AccessHub` | *if `modules.users`* |
| `@klnap/payload-iam/rsc#InviteAccept` | *if `modules.invitations`* |
| `@klnap/payload-iam/rsc#RolesListCell`, `#UserAvatarCell`, `#RoleUsersCell`, `#AccessListTabs` | list/collection UI |
| `@klnap/payload-iam/client#AdminIamStyles` | `./AdminIamStyles` |
| `@klnap/payload-iam/client#AdminSessionGuard` | `./AdminSessionGuard` |
| `@klnap/payload-iam/client#UserFooter` | `./UserFooter` |
| `@klnap/payload-iam/client#HeaderAccountHide` | `./HeaderAccountHide` |
| `@klnap/payload-iam/client#AccessNavLink` | *if `modules.users`* |
| `@klnap/payload-iam/client#Permissions*` | roles matrix fields |
| `@klnap/payload-iam/client#Invitation*` | invitation fields |
| `@klnap/payload-iam/client#UserIdentityField`, `#UserAuthInsightsField`, `#TransferRootField`, `#SendResetPasswordField`, `#UserSessionsField` | users admin |

## Verification

From this package: **`bun run check:exports`**. On the host, fix any missing keys before shipping admin UI changes.
