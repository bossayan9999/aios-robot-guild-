# CyberScool Security Policy

## Baseline

CyberScool uses deny-by-default authorization, least privilege, defense in depth, explicit trust boundaries, and evidence-backed change control. Convenience does not override these requirements.

## Identity and access

- Authenticate every human, agent, runtime, and service identity; do not share identities.
- Authorize server-side against organization, workspace, resource, action, and current task grant.
- Require step-up authentication and explicit approval for secrets, arbitrary command execution, external writes, production changes, destructive actions, and policy changes.
- Scope approvals to a described action, target, diff or plan version, risk, and expiry. A changed plan invalidates stale approval.
- Rotate and revoke sessions, runtime enrollment, connector grants, and credentials independently.

## Secrets and data

- Store secrets in an approved secret manager and pass only short-lived, task-scoped material to a runtime.
- Never expose secrets to client bundles, logs, evidence, model prompts, memory, screenshots, or source control.
- Classify data and apply tenant scope, encryption in transit and at rest, retention, export, and deletion controls.
- Treat repository content, retrieved documents, connector output, web content, and agent output as untrusted input.
- Redact credentials, tokens, cookies, personal data, and sensitive infrastructure identifiers before persistence.

## Execution and network

- Apply `.aios/sandbox-policy.md` before executing untrusted code or tools.
- Default network access to none. Allow destinations and protocols per task and record material egress.
- Block privilege escalation, host namespace access, host container sockets, unauthorized mounts, persistence, and lateral movement.
- Enforce time, CPU, memory, storage, process, request, and cost budgets.
- Verify artifacts and dependencies; pin versions and retain provenance.

## Application controls

- Validate input and output against schemas and size limits.
- Use CSRF protection where cookies authorize mutations, strict origin checks, secure cookie attributes, CSP, HSTS, and safe caching rules.
- Rate-limit authentication, approvals, connector calls, runtime enrollment, and expensive operations.
- Keep feature flags subordinate to authorization and policy.
- Use forward-only reviewed migrations, backups, restore tests, and minimized database privileges.

## Audit and incident response

Security-relevant actions emit append-only structured events with correlation, actor, tenant, task, action, target, outcome, policy version, and timestamps. Logs exclude secrets and are protected by access control, integrity measures, retention, and export rules.

Suspected compromise pauses affected work, revokes leases and credentials, preserves evidence, identifies impacted tenants, and follows an owner-visible incident process. Recovery includes root-cause analysis, control updates, regression tests, and explicit reopening approval.

## Vulnerability handling

Do not place exploitable details or secrets in public issues. Report privately to the repository owner. Triage by exploitability and impact, contain first, patch with tests, rotate affected credentials, and document verification. An independent security review is required before broad commercial or production use.
