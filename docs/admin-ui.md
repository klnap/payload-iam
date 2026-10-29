# Admin UI — detail

Companion to the [README Admin UI section](../README.md#admin-interface). Assumes default admin route **`/admin`**.

## Authentication experience

**Replaced views** ([`payload-plugin.ts`](../src/plugin/payload-plugin.ts)):

- **Login** — guest layout; form posts to **`/api/iam/auth`**. Email/password, optional OTP, optional Google. Dev **bootstrap** when no Root exists.
- **Forgot password** — if `loginFlags.forgotPassword` (default on with email/password).
- **Reset / set password** — plugin routes; **`resetToken`** uses **ResetPassword**.
- **Logout / session ended** — **`/sign-out`**, **`/session-ended`**.

**Disabled stock behavior:**

- Users **`auth.disableLocalStrategy: true`** — Better Auth is source of truth ([`patch-owned-users-collection.ts`](../src/modules/users/collections/patch-owned-users-collection.ts)).
- Stock **`admin.routes.reset`** → **`/__payload_rbac_reset_disabled__`**.

## Admin shell and navigation

**`afterNav`:** `AdminIamStyles`, `AdminSessionGuard`, `UserFooter` (sidebar account menu; header avatar hidden via `HeaderAccountHide`).

**`afterNavLinks`:** `AccessNavLink` when **`modules.users`**.

**Access hub (`/access`):** **`AccessHub`** redirects to **`/collections/users`**, **`/collections/invitations`**, or **`/collections/roles`** by permission and preference.

**`AccessListTabs`** — Description component on users / roles / invitations lists (`admin.group: false` on owned collections).

## Users management

Host **`users`** slug — **extended**. List columns IAM-owned; edit tabs **Account** (identity + roles with ceiling), **Sessions**, **Security** (insights, transfer root, send reset). Self-service is **`/account/*`**, not editing another user’s document.

## Roles and permissions

**`roles`** collection; Root hidden from list; delete always false on config.

Edit role → matrix tabs: **Collections**, **Globals**, **Access**, **Custom** (`register` / `models` / `registerExtensions`). **Role users** sidebar table. Saves run **ceiling** checks.

## Invitations

**`invitations`** when `modules.invitations`; **`create: false`** on collection — rows via API/UI. **`/invite/accept`** guest view.

## Account self-service

| Route | View |
| ----- | ---- |
| `/account` | Account |
| `/account/sessions` | Sessions |
| `/account/security` | AccountSecurity |
| `/account/linked` | AccountLinked (Google when enabled) |

## Route map

```
/admin/login, /forgot?, /reset-password, /set-password, /reset/:token
/admin/sign-out, /session-ended
/admin/invite/accept
/admin/account, /account/sessions, /account/security, /account/linked
/admin/access                 → redirect to IAM collections
/admin/collections/users|roles|invitations
/admin/collections/{host…}    (RBAC-wrapped)
```

Auth API: **`/api/iam/auth/*`** (separate Next route). Import map: [import-map.md](./import-map.md).
