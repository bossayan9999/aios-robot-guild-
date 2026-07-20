# ADR 0005: Controlled Learning Governance

Status: Accepted

## Decision

CyberScool may propose learning candidates only from approved, provenance-bearing outcomes. Candidates remain quarantined until privacy review, evaluation against a baseline, specialist/security review, and human approval pass.

Promoted learning is tenant-scoped, versioned, expiring where appropriate, measurable, and reversible. It may improve suggestions, routing, or reliability scores but may never grant permissions, remove approvals, widen network access, expose secrets, or rewrite production security policy.

## Consequences

- Source revocation or failed evaluation can retire a learning version.
- Raw untrusted content and failed outputs do not become durable instructions.
- Performance claims require reproducible evaluation evidence.
