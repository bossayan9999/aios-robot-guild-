# ADR 0002: Server-Authoritative Task State Machine

Status: Accepted

## Decision

The long-term task lifecycle uses these states:

`CREATED -> PLANNING -> WAITING_FOR_APPROVAL -> ASSIGNED -> SANDBOX_PROVISIONING -> RUNNING -> TESTING -> REVIEWING -> VALIDATING -> STAGING -> SECURITY_REVIEW -> WAITING_FOR_COMPLETION_APPROVAL -> COMPLETED`

Exceptional states are `REPAIRING`, `FAILED`, `BLOCKED`, `CANCELLED`, and `ROLLED_BACK`.

`STAGING` is conditional when a task produces a releasable or deployable artifact. `REPAIRING` returns to `RUNNING` through a bounded, recorded retry.

The current mission statuses remain supported until a forward migration maps them to the canonical model: `awaiting_approval` to `WAITING_FOR_APPROVAL`, `approved` to `ASSIGNED`, `running` to `RUNNING`, `review_required` to `WAITING_FOR_COMPLETION_APPROVAL`, `completed` to `COMPLETED`, `revision_requested` to `REPAIRING`, `rejected` to `CANCELLED`, and `failed` to `FAILED`. Transitions are validated server-side, idempotent, append an audit event, and identify actor, reason, plan version, and evidence.

## Consequences

- Failed review or validation enters bounded repair or a non-complete terminal state.
- Cancellation revokes active leases; rollback is a new evidenced operation.
- `COMPLETED` is unreachable until explicit security review, completion approval, and every completion gate pass.
