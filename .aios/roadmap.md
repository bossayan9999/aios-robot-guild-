# CyberScool Roadmap

Roadmap order is risk-driven. A later phase cannot weaken the controls established earlier.

## Phase 0 — Foundation and contracts

- Adopt the `.aios` operating documents and root `AGENTS.md`.
- Preserve the current PWA, Worker, D1, mission, approval, audit, passkey, memory, release, and terminal-companion behavior.
- Protect foundation invariants with repository contract tests and CI lint/test/build gates.

Exit: policies are versioned, linked, reviewable, and validated in CI.

## Phase 1 — Tenant-ready control plane

- Add organization and workspace records with explicit membership and roles.
- Introduce the canonical task state machine, transition guards, correlation IDs, and evidence manifests.
- Add typed feature flags, approval policies, retention policy, and stronger audit queries.
- Migrate existing owner data into a default isolated workspace without data loss.

Exit: isolation and authorization tests prove no cross-workspace access; all task transitions are durable and policy-checked.

## Phase 2 — Specialists and registries

- Implement the Copilot Manager orchestration contract and specialist manifests.
- Add versioned skill, plugin, connector, and capability registries.
- Support typed handoffs, bounded budgets, cancellation, retries, and human reassignment.
- Deliver the custom specialist builder with validation and least-privilege defaults.

Exit: a multi-specialist task can be replayed from events and every tool call maps to an active grant.

## Phase 3 — Hybrid execution

- Formalize the restricted local runtime agent and replace ad hoc command strings with structured actions.
- Add hardened Docker execution and runtime attestation.
- Add enrollable VPS, cloud, and private-server agents with revocable identity and health reporting.
- Keep mobile as a control/approval client; require step-up authentication for high-risk actions.

Exit: the same approved task runs predictably across supported runtimes and produces comparable evidence.

## Phase 4 — Validation and deployment

- Add validator registry, policy-as-code checks, artifact signing, provenance, and environment promotion.
- Implement deployment previews, canaries, rollback plans, and post-deployment verification.
- Require security review and explicit production approval based on risk.

Exit: deployments are reproducible, attributable, reversible, and cannot bypass completion gates.

## Phase 5 — Controlled learning and scale

- Derive learning candidates only from approved evidence and measured outcomes.
- Add evaluation suites, quarantine, promotion approval, versioning, rollback, and tenant controls.
- Add operational SLOs, queue scaling, backup/restore exercises, incident response, and independent security review.

Exit: promoted learning improves measured performance without crossing tenant or policy boundaries.

## Phase 6 — Connector platform

- Add registry lifecycle, tenant-scoped grants, short-lived credentials, health verification, revocation, rate limiting, and audit logging.
- Deliver verified connectors for GitHub, Cloudflare, Supabase, Gmail, Google Calendar, Google Drive, Slack, Notion, OpenAI/model providers, custom REST APIs, and MCP servers.

Exit: no connector is shown as connected without a successful backend verification, and every write maps to a current approval and grant.

## Phase 7 — Real execution runtimes

- Add local Windows and Linux/macOS agents, Docker sandbox, VPS, private-server, cloud-worker, and network-agent profiles.
- Implement runtime registration, short-lived credentials, heartbeat/health, capability manifests, revocation, and emergency stop.

Exit: runtime identity and health are verified, leases can be cancelled, and agents cannot widen their own capabilities.

## Phase 8 — Real terminal

- Add an xterm.js client over authenticated PTY sessions with PowerShell and Bash adapters.
- Enforce working-directory restrictions, command policy, approvals, streaming, history, redaction, and audit records.

Exit: terminal sessions are restricted, attributable, revocable, and never represented as connected before a live handshake.

## Phase 9 — Mobile remote access

- Extend the PWA with QR or short-code device pairing, remote approvals, terminal-output viewing, runtime health, security alerts, and pause/stop controls.
- Add device revocation and step-up authentication for high-risk actions.

Exit: a lost mobile device can be revoked independently and cannot bypass runtime or approval policy.

## Phase 10 — Research and development platform

- Add research projects, source library, citations, hypotheses, experiment runner, prototype sandbox, datasets, agent evaluations, decision records, and publishable reports.

Exit: findings retain source provenance and decisions can be reproduced from approved evidence.

## Phase 11 — Network and security center

- Add authorized inventory and topology, ping/traceroute/DNS, routing/VLAN validation, VPN/firewall review, read-only SNMP, configuration backup/comparison, firmware review, baselines, and controlled update plans.

Exit: read-only is the default and every live target is explicitly authorized and allowlisted.

## Phase 12 — Controlled self-learning

- Track outcomes, lesson candidates, evidence quality, specialist performance, tool reliability, prompt/specialist versions, expiry, approval, and rollback.

Exit: learning is evaluated, versioned, reversible, tenant-scoped, and never self-promotes permissions or policy changes.

## Phase 13 — Hybrid deployment

- Support Cloudflare Workers, D1 or Supabase, object storage, Docker Compose, VPS/private servers, CI/CD, staging, production approvals, monitoring, backups, and rollback.

Exit: promotions are evidenced, approved, monitored, backed up, and reversible.

## Phase 14 — Production hardening

- Add tenant-isolation, role/permission, and rate-limit tests; secret, dependency, and container scanning; OpenTelemetry; incident response; restore exercises; disaster recovery; and independent security review.

Exit: production readiness is supported by independent evidence rather than feature completion alone.

## Release milestones

- **v0.1 — Foundation:** mission, architecture, security, sandbox, specialists, connectors, and completion policies.
- **v0.2 — Application shell:** professional CyberScool navigation, honest connection states, Guild View, and the first backend-compatible task slice.
- **v0.3 — Task engine:** canonical task state machine and enforceable completion gates.
- **v0.4 — Copilot Manager:** specialist registry, assignment, handoffs, and review orchestration.
- **v0.5 — Connectors:** verified GitHub and Cloudflare integrations.
- **v0.6 — Runtime:** real restricted terminal and local runtime agent.
- **v0.7 — Mobile:** pairing, approvals, health, alerts, and stop controls.
- **v0.8 — R&D and network:** durable research and authorized network centers.
- **v0.9 — Learning:** controlled learning and specialist/tool evaluation.
- **v1.0 — Production:** hardened, observable, recoverable hybrid platform.

The system never grants itself permissions, removes approvals, widens network access, exposes secrets, or rewrites production security policy.
