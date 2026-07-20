# ADR 0001: Separate Control and Execution Planes

Status: Accepted

## Decision

CyberScool separates the server-authoritative control plane from every execution runtime. The control plane owns identity, policy, task state, approvals, capability grants, leases, and evidence. Local, container, VPS, cloud, private-server, and network agents execute only the bounded lease they receive.

## Consequences

- A runtime cannot authorize itself, widen scope, or declare authoritative completion.
- Runtime loss does not erase task history; leases expire and can be revoked.
- Every dispatch carries tenant, task, policy, capability, budget, and evidence context.
- Additional runtimes implement one versioned protocol instead of duplicating orchestration logic.
