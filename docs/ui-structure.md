# IAM plugin — UI structure

## File naming (React / Next)

- **Files and folders:** `kebab-case.tsx` / `kebab-case.ts`
- **Components:** `PascalCase` export inside the file
- **Route / RSC entrypoints:** stable names in `exports/rsc.ts` (`Login`, `ForgotPassword`, …)

## Layout per feature module

Module roots follow [ADR 0004](adr/0004-payload-module-folder-dictionary.md). Under `modules/<feature>/ui/`:

| Folder | Purpose |
| :--- | :--- |
| `views/` | Payload admin views — thin server components |
| `components/` | Reusable UI for that module |
| `hooks/` | Client hooks and small UI helpers (no `lib/` folder) |
| `hooks/` | Client hooks for non-trivial form/state |
| `client/` | Browser-only clients |

## Styling

- **Tailwind + `cn()`** for all custom UI.
- **Payload login hooks** (`login`, `login__form`, `btn`, `field-type`, …) only where stock admin login CSS must apply — see `shared/ui/guest/guest-payload-form.ts`.
- No bespoke BEM / `.rbac-*` layout classes for guest routes; shell layout is Tailwind on `GuestLayout`.
- **Host Tailwind:** import `@klnap/payload-iam/styles/iam-tailwind.css` or compile from `./styles/entry.css` with `@source` on this package when TSX classes change. Shell CSS loads via `AdminIamStyles` in `afterNav`.
- **Prebuilt CSS:** run `bun run build:styles` for `styles/iam-tailwind.css` and `styles/iam-admin.css`.
- **Base UI** for custom controls; **@payloadcms/ui** for native admin widgets.

## Shared guest shell (`shared/ui/guest/`)

Routes outside the normal admin chrome (login, invite, forgot/reset password, bootstrap root):

| File | Role |
| :--- | :--- |
| `guest-layout.tsx` | Centered column + optional `logo` slot |
| `guest-logo.tsx` / `guest-logo-props.ts` | Payload `Logo` + `guestLogoPropsFromAdminView` |
| `guest-page.tsx` | `GuestPage` compound (`Title`, `Description`, `Content`, `Back`) |
| `guest.styles.ts` | `tv()` for guest shell + page rhythm |
| `guest-page-back.tsx` | Back link/button for `GuestPage.Back` |
| `guest-payload-form.ts` | `guestForm` = `login__form` + Tailwind field layout; `guestInlineLink` |
| `use-guest-page-theme.ts` | Resolved light/dark |
| `guest-theme-toggle.tsx` | Fixed theme control |
| `browser-credential-save.ts` | Credential Manager helpers |

See [specs/iam-ui-shells.md](../specs/iam-ui-shells.md).

## Shared email shell (`shared/emails/layout/`)

| File | Role |
| :--- | :--- |
| `email-layout.tsx` | Html/body/container, logo, footer |
| `email.tsx` | `Email.Title`, `Description`, `Content`, `Meta` |
| `email-logo.tsx` | Brand wordmark (light/dark) |
| `transactional-email-layout.tsx` | Deprecated facade delegating to `EmailLayout` + `Email.*` |

Product transactional templates live under `modules/auth/emails/` and `modules/invitations/emails/` (not `src/emails/`). `src/emails/` holds preview shims for `email:dev` only — see [structure-cleanup-decisions.md](structure-cleanup-decisions.md).

## `modules/auth/ui/`

Views in `views/`; forms in `components/`; `lib/`, `hooks/use-login-form.ts`.

Auth barrel re-exports `GuestPage` from `shared/ui/guest/guest-page.tsx`.
