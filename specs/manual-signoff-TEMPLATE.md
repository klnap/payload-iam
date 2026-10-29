# IAM manual sign-off

Save completed manual runs as `specs/manual-signoff-YYYY-MM-DD.md` when you need an audit trail.

| Field | Value |
| :--- | :--- |
| Date | |
| Commit | |
| `SERVER_URL` | |
| Tester | |

## D checklist

| D# | PASS | Notes |
| ---: | :--- | :--- |
| 1 | | |
| 2a | | Panel logout |
| 2b | | SKIP / |
| 2c | | |
| 3 | | |
| 4 | | SKIP / |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | Field spot R/C/U/D/Publish |
| 9 | | |
| 10 | | |
| 11 | | |
| 12 | | |
| 13 | | |
| 14 | | |

## Automated (same release)

- [ ] `bun pkg payload-iam test`
- [ ] `bun pkg payload-iam test:e2e`
- [ ] `bun pkg payload-iam test:host-regression` (local)
