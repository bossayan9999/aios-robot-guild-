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
