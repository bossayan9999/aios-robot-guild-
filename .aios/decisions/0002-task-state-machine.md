# ADR 0002: Server-Authoritative Task State Machine

Status: Accepted

## Decision

The long-term task lifecycle uses these states:

`CREATED -> PLANNING -> WAITING_FOR_APPROVAL -> ASSIGNED -> SANDBOX_PROVISIONING -> RUNNING -> TESTING -> REVIEWING -> VALIDATING -> STAGING -> COMPLETED`

Exceptional states are `REPAIRING`, `FAILED`, `BLOCKED`, `CANCELLED`, and `ROLLED_BACK`.

The current mission statuses remain supported until a forward migration maps them to the canonical model. Transitions are validated server-side, idempotent, append an audit event, and identify actor, reason, plan version, and evidence.

## Consequences

- Failed review or validation enters bounded repair or a non-complete terminal state.
- Cancellation revokes active leases; rollback is a new evidenced operation.
- `COMPLETED` is unreachable until every completion gate passes.
