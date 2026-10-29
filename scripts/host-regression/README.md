# Host regression (layer C)

HTTP checks against a **running** IAM host. Not CI by default.

```bash
export IAM_HOST_REGRESSION_URL=http://localhost:8010
export IAM_HOST_REGRESSION_OTP_LOG=/path/to/cms.log   # [dev-mail] otp=
bun run test:host-regression
```

Optional: `IAM_HOST_REGRESSION_PG_CONTAINER`, `IAM_HOST_REGRESSION_PG_DB` for `clearRateLimit()` SQL.

OTP helper: `./fetch-login-otp.sh "$IAM_HOST_REGRESSION_OTP_LOG"`

Case map (legacy `M-*` ids in suite output → `iam-testing.md` C01–C09):

| C# | Focus |
| ---: | :--- |
| C01 | Auth OTP, session, sign-out, bad OTP |
| C02 | Invite duplicate / flow |
| C03 | Revoke invite |
| C04 | Expired invite |
| C05 | Anon invite 401 |
| C06 | Password reset email API |
| C07 | PATCH RBAC |
| C08 | Sessions |
| C09 | Junior / root deny |
