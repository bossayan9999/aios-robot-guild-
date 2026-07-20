# Backend Tasks for the CyberScool Application Shell

The v0.2 UI must show these capabilities as **Not configured** or **Unavailable** until the corresponding server contract exists and verifies real state.

## Task engine and evidence

- Introduce the canonical task and gate records from `.aios/architecture.md` without breaking existing missions.
- Add explicit specialist assignments, validation results, security reviews, evidence manifests, and final completion eligibility.
- Add paginated, tenant-scoped audit and policy-decision endpoints, including blocked operations.

## Connectors

- Build a tenant-scoped connector registry with versioned manifests and read/write/destructive action classification.
- Add secret references, OAuth callback state, API-key lifecycle, health verification, revocation, rate limits, idempotency, and audit events.
- Implement GitHub, Cloudflare, Supabase, Gmail, Google Calendar, Google Drive, Slack, Notion, model-provider, MCP, and generic REST adapters incrementally.

Acceptance: the UI receives authoritative `connected`, `disconnected`, `checking`, `error`, or `not_configured` state with `verified_at`; installation alone never returns `connected`.

## Runtimes and terminal

- Add runtime enrollment, signed capability manifests, short-lived credentials, heartbeat, leases, revocation, emergency stop, and mobile pairing.
- Add restricted PTY sessions for PowerShell and Bash with workspace confinement, command policy, approvals, streaming, history, secret redaction, and audit evidence.
- Add Docker, VPS, private-server, cloud-worker, Linux/macOS, and authorized network-agent adapters.

## Product domains

- Research: projects, sources, citations, hypotheses, experiments, prototypes, datasets, findings, evaluations, decisions, and reports.
- Development: repository tree/read APIs, restricted workspace edits, build/test runs, branch status, and pull-request status.
- Network: approved inventory, topology, read-only checks, findings, backups, comparisons, and controlled change plans.
- Settings: organizations, workspaces, roles, feature flags, retention, and device/session management.

## Safety controls

- Rate-limit authentication, approvals, connector calls, runtime registration, terminal sessions, and costly tasks.
- Add explicit cancellation/pause APIs before enabling mobile or global stop controls.
- Preserve append-only audit evidence, tenant isolation, secret redaction, and server-authoritative approval gates.
- Never allow an agent or feature flag to grant permissions, remove approval requirements, widen egress, expose secrets, or rewrite production security policy.
