# Completion Gates

A task may enter `completed` only when every applicable gate records `passed` with evidence. `not_applicable` requires a reason and policy authority; it is not the same as missing evidence.

## Required gates

1. **Implementation** — requested behavior and artifacts exist within the approved scope; the diff or delivered output is identified.
2. **Tests** — relevant automated and manual tests pass in a recorded environment. Skipped tests have explicit justification and approval.
3. **Validation** — acceptance criteria, schemas, policies, compatibility, and operational checks pass; critical results are reproducible.
4. **Specialist review** — a qualified specialist independent of the implementation step reviews correctness, maintainability, and domain-specific risk.
5. **Security review** — threat boundaries, authorization, isolation, secrets, dependencies, data handling, abuse cases, and rollback are reviewed proportionally.
6. **Evidence capture** — plan version, changes, commands, test output, reviews, artifact hashes/links, approvals, residual risks, and timestamps are durable and tenant-scoped.
7. **Required approvals** — all policy-required human or organizational decisions are current, scoped to the final plan/output, and made by authorized actors.

## Additional conditional gates

- Deployment: artifact provenance, environment approval, health checks, observability, canary/promotion criteria, and rollback verification.
- Data migration: backup, compatibility, integrity checks, rollback/forward-fix plan, and retention impact.
- Connector/plugin: manifest validation, permission review, secret handling, health, rate limits, and revocation test.
- Learning promotion: provenance, privacy review, evaluation against baseline, bias/abuse tests, approval, versioning, and rollback.
- High-risk security/network work: written authorization, target allowlist, rules of engagement, containment, and findings handling.

## Gate behavior

Gate results are immutable records superseded by newer results. Any material change after a pass invalidates affected gates. The control plane, not an agent or UI, computes completion eligibility. Administrators may resolve policy or assign reviewers but cannot directly force `completed` without producing the required signed decisions and evidence.

Failure returns actionable findings to execution or moves the task to `blocked` or `failed`. Evidence remains available for audit. Completion language in messages, dashboards, rewards, or reports must reflect the authoritative state.
