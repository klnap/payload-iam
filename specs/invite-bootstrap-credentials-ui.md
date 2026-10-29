# Invite & bootstrap credentials UI

## Acceptance

1. Root bootstrap HTTP form collects full name + email only; server generates a policy-compliant password and returns `generatedPassword` once on success.
2. Invite accept (credential path) activates with one action; server may omit `password` in POST body and returns `generatedPassword` when generated.
3. Success screens show masked generated password with reveal toggle and copy (Payload `CopyToClipboard`), plus download credentials and go to dashboard.
4. When `payloadIam.login.google` is true and `emailAndPassword` is false, invite accept shows Google-only; acceptance uses FIRST_GOOGLE in OAuth callback (no credential, no password UI).
5. Login form CSS uses explicit class constants (`LOGIN_FORM_*`) with `cn()` — no `${base}__suffix` concatenation.

## Validation

```bash
bun pkg payload-iam test
```
