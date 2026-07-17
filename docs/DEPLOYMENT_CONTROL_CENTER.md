# Deployment Control Center v1

Build identifier: `2026.07.17-dcc1`

## Included

- Deployment tab with UI-to-Worker build comparison
- `/api/health` release metadata and timestamps
- Request IDs for support correlation
- CSP, HSTS, frame, MIME, referrer and permissions headers
- Mobile layout for deployment checks
- GitHub Actions test/build quality gate

## Deploy

1. Copy the update into the repository root while preserving folders.
2. Commit and push all changed files to `main`.
3. Confirm the GitHub `Quality gate` passes.
4. Confirm Cloudflare deploys the same commit.
5. Open **Deployment** in Robot Guild and run the live check.
6. The UI and Worker build IDs must both show `2026.07.17-dcc1`.

Do not put API keys in source, GitHub Actions, screenshots, or browser storage.
