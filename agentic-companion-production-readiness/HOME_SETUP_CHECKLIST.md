# Home Setup Checklist

## Open before continuing

- GitHub Desktop
- Visual Studio Code
- Windows Terminal or Command Prompt
- Docker Desktop only when the local companion sandbox milestone begins
- The local agentic-companion repository folder

## First repository bootstrap

The remote repository is empty. Create its first commit from this safety baseline before adding executable code.

1. Extract this package.
2. Clone or create the empty agentic-companion repository with GitHub Desktop.
3. Copy README.md, SECURITY.md, .gitignore, .env.example, config and docs into the repository root.
4. Confirm that no .env, key, token, password, database file, upload, or personal file is included.
5. In Command Prompt opened inside the repository, run each command separately:

   git status
   git add README.md SECURITY.md .gitignore .env.example config docs
   git commit -m "Bootstrap production-readiness baseline"
   git push origin main

6. Create the implementation branch:

   git switch -c codex/production-readiness
   git push -u origin codex/production-readiness

## Verify

- GitHub main contains only the baseline files.
- .env is ignored.
- codex/production-readiness is the current local branch.
- No Cloudflare or production deployment is connected yet.
- No real secrets appear anywhere in GitHub.

## Architecture decision before coding

Approve these choices:

- Cloud UI and API runtime
- Database and migration tool
- Authentication provider
- Durable mission queue
- Local companion runtime
- Hosting and staging targets

Recommended starting shape:

- TypeScript monorepo
- React or equivalent web client
- Typed HTTP API
- PostgreSQL for multi-tenant SaaS records
- Durable queue for mission stages
- Node.js local companion bound to 127.0.0.1
- Docker only for disposable sandbox jobs

Do not add unrestricted remote shell access.

## First executable milestone

1. Locked package manifest and lockfile.
2. CI for tests, type checks, build, secret scanning and dependency review.
3. Health endpoints.
4. Minimal authenticated dashboard reading config/capabilities.json.
5. No device execution yet.

## Second milestone

1. Device registration and expiring one-time pairing.
2. Localhost-only companion.
3. Approved project-root restriction.
4. Small command allowlist.
5. Preview, approve, run, redact and audit flow.
6. Timeout, cancel and emergency stop.

## Completion evidence

Every milestone must include:

- Passing automated tests
- Successful production build
- No committed secrets
- Reviewed migration plan
- Threat-model update
- Draft pull request
- Owner approval before merge or deployment
