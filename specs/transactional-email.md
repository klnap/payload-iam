# IAM transactional email

## 1. Problem Statement

IAM sends invitation, OTP, reset, and set-password mail through Payload. Copy was hardcoded in English, templates had no brand/i18n, and hosts could not override layout or templates safely.

## 2. Solution Overview

- Resolve one `EmailRenderContext` per send from Payload (`serverURL`, adapter, i18n) plus `iam({ email: { logo, fonts, locale, theme, templates } })`.
- Default React Email templates under `modules/auth/emails/` and `modules/invitations/emails/`; preview via `src/emails/` thin shims (`email:dev`); optional host components via `email.templates`.
- Public data/copy types exported from `@klnap/payload-iam/email`.
- Delivery stays on `payload.sendEmail` / `config.email` only.

## 3. Scope

**In scope:**

- Four transactional kinds: invitation, login OTP, reset password, set-password.
- pl / en / de copy via `iam:email:*` keys (bundled trees; host override via Payload `i18n.translations` or `@klnap/payload-iam/i18n` merged in `payload.config`).
- Brand header from `email.logo` paths (resolved against `serverURL`) or omitted.
- Typography from `email.fonts` (family, fallback stack, web `faces`); default Geist Sans via CDN.
- Theme defaults (Geist CDN fonts, Tailwind layout colors).
- Template registry + typed `data` / `copy` props.

**Out of scope:**

- Mapping `admin.graphics.Logo` automatically.
- Per-recipient `resolveLocale` (hook exists; product wiring later).
- Reply-to / BCC in `iam()` config.

## 4. Acceptance Criteria

1. All four mails call `payload.sendEmail` with HTML + text; subjects from i18n.
2. CMS configures `iam({ email: { logo: { src, srcDark?, alt?, width? } } })` with public assets under `serverURL` (default mail locale: `en`).
3. `bun run email:dev` in `packages/payload-iam` previews templates with mock brand/copy (no Payload).
4. Host may set `email.templates.invitation` (etc.) and receive typed `IamEmailRenderProps`.
5. `bun pkg payload-iam test:unit` covers context resolution and render snapshot.

## 5. Data contract

| Kind | `data` fields | `copy` (pre-translated) |
| :--- | :--- | :--- |
| invitation | `inviteUrl`, `expiresAtIso`, `appName` | subject, preview, title, body, cta, expiresLine |
| login-otp | `otp`, `expiresInMinutes`, `appName` | subject, preview, title, body, otpLabel, expiresLine |
| reset-password | `resetUrl`, `expiresAtIso`, `appName` | subject, preview, title, body, cta, expiresLine |
| set-password | `setPasswordUrl`, `expiresAtIso`, `appName` | subject, preview, title, body, cta, expiresLine |

Shared render props: `brand`, `theme`, `fonts`, optional `extras` from `email.enrichData`.

## 6. Validation Commands

```bash
bun pkg payload-iam test:unit
bun pkg payload-iam check:boundaries
bun pkg payload-iam typecheck
```

## 7. Testing Decisions

- Unit: `resolveEmailRenderContext`, `buildInvitationEmailCopy`, render HTML contains brand src when logo set.
- Manual: M-11.x matrix rows for invite/OTP/reset mail content (when matrix updated).

## 8. Documentation Impact

- Host CMS: merge `iamPluginTranslations` into Payload `i18n`; set `email.logo`; optional `@klnap/payload-iam/email` for custom templates.
