# Agentic Companion

Agentic Companion is intended to provide a controlled bridge between a user-approved web control plane and a local desktop companion.

## Repository status

The repository is in bootstrap state. No runtime stack, database provider, deployment target, authentication system, or agent execution engine has been approved yet.

Production implementation must follow the review gates in docs/PRODUCTION_READINESS.md.

The future dashboard must read capability state from config/capabilities.json. Its presentation contract is documented in docs/CAPABILITY_DASHBOARD.md.

## Security boundary

- Default to localhost-only local services.
- Never commit secrets or personal files.
- Restrict file access to explicitly approved project roots.
- Preview commands before execution.
- Require approval for destructive actions, production changes, external messages, money, credentials, and security testing outside a disposable authorized lab.
- Record tamper-evident audit events without recording secret values.
- Provide pause, cancel, timeout, resource limits, and emergency stop.

## Bootstrap

1. Copy .env.example to a local .env.
2. Select and document the runtime stack before adding package files.
3. Add automated tests and CI in the same pull request as the first executable code.
4. Use a feature branch and draft pull request; do not commit directly to the protected production branch.

## Reporting security issues

See SECURITY.md.
