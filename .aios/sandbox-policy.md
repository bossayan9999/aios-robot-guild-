# Sandbox-First Execution Policy

## Default rule

Any code execution, build, test, automation, network probe, file mutation, or external-system action begins in the strongest practical isolated environment. Read-only inspection may run outside a sandbox only within explicitly provided resources and access boundaries.

## Capability envelope

Before execution, policy resolves and records:

- organization, workspace, task, actor, and runtime identity;
- exact filesystem roots and read/write modes;
- structured tools or allowed commands and arguments;
- network destinations, ports, methods, and purpose;
- secret references and delivery lifetime;
- CPU, memory, disk, process, time, request, and cost limits;
- permitted outputs and evidence requirements;
- expiry, cancellation signal, and escalation path.

Anything not granted is denied. Agents cannot modify their envelope.

## Runtime profiles

- **Local restricted agent:** loopback-only control endpoint by default, one-time pairing, origin and session validation, workspace-root confinement, structured actions, per-run confirmation, and no implicit arbitrary shell.
- **Docker:** unprivileged user, all Linux capabilities dropped, `no-new-privileges`, read-only root filesystem where possible, explicit writable mounts, internal network or no network, resource quotas, and no host/container-engine socket.
- **VPS/cloud/private server:** dedicated service identity, isolated working directory or container, mutual authentication, outbound control channel where possible, host policy enforcement, restricted service access, and revocable enrollment.
- **Mobile:** control, review, evidence, and approval surface only by default; it does not become a privileged execution runtime.

## Escalation

An action that cannot succeed inside its envelope stops and requests a narrowly scoped escalation. The request explains the action, target, reason, data involved, reversibility, and evidence to collect. Approval is time-limited and single-purpose. It does not authorize adjacent actions.

Destructive or hard-to-reverse operations require verified targets, backup or rollback where possible, preview/dry run, explicit user confirmation, and post-action verification.

## Output handling

Scan outputs for secrets, malicious content, path escapes, unexpected executables, and policy violations before publishing or promoting them. Preserve hashes and provenance for material artifacts. Destroy ephemeral sandboxes and revoke leases after evidence collection according to retention policy.

## Prohibited defaults

No privileged containers, host root mounts, container-engine sockets, unrestricted egress, shared tenant workspaces, persistent credentials, silent background execution, self-approved escalation, or production access by default.
