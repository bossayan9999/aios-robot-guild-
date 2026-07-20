# ADR 0003: Restricted Runtime Agent Security

Status: Accepted

## Decision

Runtime agents are deny-by-default, separately authenticated identities. They accept structured, task-scoped actions through expiring leases and report heartbeats, outputs, and evidence. Arbitrary terminal capability is distinct, high risk, and approval-gated.

## Required controls

- Workspace-root confinement, command/tool allowlists, resource ceilings, and default-denied network access.
- Short-lived credentials, secret redaction, mutual authentication, revocation, and emergency cancellation.
- Unprivileged containers with dropped capabilities, no host socket, and explicit mounts.
- Loopback-only local control by default with owner-confirmed pairing.

An agent never grants itself permissions or persists beyond its authorized lease.
