# CyberScool Platform Architecture

## Current foundation

The repository currently provides a React and Vite PWA, a Cloudflare Worker API, D1 migrations, an owner-authenticated mission workflow, approvals, structured audit events, knowledge retrieval, release proposals, passkeys, and a loopback-only terminal companion. These are preserved as the first product slice of the larger CyberScool platform.

## Logical architecture

1. **Experience plane** — desktop and mobile PWA surfaces for objectives, plans, evidence, approvals, runtime health, and administration. Clients never receive provider or infrastructure secrets.
2. **Control plane** — the Worker/API authenticates actors, enforces organization and workspace scope, advances the task state machine, evaluates policy, dispatches bounded work, and records events.
3. **Agent plane** — the Copilot Manager decomposes objectives and coordinates versioned specialists. Every delegation has an input contract, capability envelope, budget, output schema, and reviewer.
4. **Execution plane** — runtime adapters dispatch jobs to local restricted agents, Docker sandboxes, VPS workers, cloud workers, or private-server workers. Runtimes report capabilities and attest to execution; they do not decide authorization.
5. **Integration plane** — plugins provide packaged capability; connectors provide scoped access to external systems. The registry controls versions, permissions, health, and revocation.
6. **Evidence and memory plane** — durable task events, test results, diffs, review decisions, approvals, provenance, and approved learning records. Tenant scope is mandatory on every record and query.

## Task state machine

The canonical lifecycle is:

`CREATED -> PLANNING -> WAITING_FOR_APPROVAL -> ASSIGNED -> SANDBOX_PROVISIONING -> RUNNING -> TESTING -> REVIEWING -> VALIDATING -> STAGING -> SECURITY_REVIEW -> WAITING_FOR_COMPLETION_APPROVAL -> COMPLETED`

`STAGING` is conditional for work that produces a releasable or deployable artifact. Exceptional and repair states are `REPAIRING`, `FAILED`, `BLOCKED`, `CANCELLED`, and `ROLLED_BACK`. `REPAIRING` returns to `RUNNING` through a bounded, recorded retry; it is not a path around approval or validation.

- Transitions are server-authoritative, append an audit event, and are idempotent.
- `WAITING_FOR_APPROVAL` may be skipped only when policy classifies every planned action as pre-authorized and low risk.
- A failed validation or review enters `REPAIRING` with findings, or moves the task to `BLOCKED`/`FAILED`.
- `COMPLETED` is reachable only after `SECURITY_REVIEW` and `WAITING_FOR_COMPLETION_APPROVAL` and only when all gates in `.aios/completion-gates.md` pass.
- Cancellation revokes pending leases and credentials; rollback is a new evidenced operation, not an erased history.

The existing mission API remains compatible during migration. Its statuses map as follows: `awaiting_approval` to `WAITING_FOR_APPROVAL`, `approved` to `ASSIGNED`, `running` to `RUNNING`, `review_required` to `WAITING_FOR_COMPLETION_APPROVAL`, `completed` to `COMPLETED`, `revision_requested` to `REPAIRING`, and `rejected` to `CANCELLED`. `failed` maps to `FAILED`. New task-engine records use only the canonical states.

## Core domain records

- Organization, workspace, membership, role, and policy binding.
- Task, plan version, work item, dependency, state transition, and execution lease.
- Specialist definition, skill version, capability grant, and handoff.
- Plugin, connector, credential reference, runtime, and feature flag.
- Approval request, decision, scope, expiry, and approving actor.
- Evidence artifact, validation result, review result, deployment record, and audit event.
- Memory source, derived learning, provenance, trust state, retention, and revocation.

## Security and isolation boundaries

Every request and background job carries `organization_id`, `workspace_id`, `actor_id`, `task_id`, and `correlation_id`. Authorization is evaluated at the server and repeated by the runtime adapter. Credentials are referenced by opaque IDs, resolved only inside the authorized execution boundary, redacted from output, short-lived where possible, and never written to model context or browser storage.

Organization and workspace identifiers become part of database keys, indexes, object paths, cache keys, queues, logs, and retrieval filters. Cross-workspace sharing requires an explicit, audited grant. No agent may widen its own capability envelope.

## Runtime contract

Each runtime advertises a signed capability manifest: runtime type, platform, workspace root, available tools, network policy, resource ceilings, secret providers, sandbox strength, and health. A dispatched execution contains immutable plan and policy versions, an expiring lease, allowed commands/tools, filesystem roots, network destinations, budgets, and expected evidence.

Local terminal architecture binds to loopback by default, pairs with a one-time owner-confirmed code, and uses a restricted runtime agent. Command execution is structured and allowlisted; arbitrary shell access is a separate high-risk capability requiring explicit approval. Docker uses unprivileged containers, dropped capabilities, read-only base filesystems, resource limits, and no host socket. VPS, cloud, and private-server agents use mutual authentication, outbound-only control connections where possible, scoped service identities, and revocable enrollment.

## Feature flags

Flags are typed, default-off for risky or incomplete capabilities, scoped by environment/organization/workspace, and evaluated server-side. Changes identify actor and reason, generate audit events, support expiry, and preserve a kill switch. A flag cannot bypass authorization, isolation, validation, or completion gates.

## Evolution strategy

Extend the existing Worker/D1 product incrementally: first codify contracts and tenant-ready schemas, then introduce durable orchestration and registries, then runtime adapters and remote access, and finally controlled learning and broader deployments. Migrations remain forward-only and compatible; existing owner-scoped behavior maps to a default organization and workspace during transition.
