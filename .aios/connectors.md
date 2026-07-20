# Plugin and Connector Registry

Plugins package platform capability such as specialists, skills, tools, validators, or runtime adapters. Connectors authorize interaction with an external system. Installation is not authorization: every connector grant is separately scoped to an organization/workspace and actor or task.

## Registry record

Each entry includes:

- stable ID, display name, owner/publisher, type, version, and integrity digest;
- supported actions with input/output schemas and read/write/destructive classification;
- requested permissions, data classes, secret requirements, and allowed destinations;
- compatible platform/runtime versions and feature flag;
- install, configuration, health, rate-limit, timeout, retry, and revocation behavior;
- audit event mappings, evidence output, retention impact, and incident contact;
- review status, provenance/signature, vulnerabilities, deprecation, and kill-switch state.

## Lifecycle

`discovered -> reviewed -> installed -> configured -> enabled -> suspended -> revoked`

Security review precedes installation of executable capability. Owner or delegated administrator approval precedes enablement. Version or permission expansion returns the entry to review. Suspension blocks new operations; revocation also invalidates grants and credentials.

## Invocation rules

- Resolve organization/workspace, actor, task, capability, and policy before every call.
- Prefer read-only actions and previews. External writes, messages, deployments, purchases, destructive changes, and permission changes require explicit scoped approval.
- Use short-lived delegated credentials, never expose them to the browser or model, and redact provider responses before logs or memory.
- Validate schemas, targets, sizes, content types, redirect behavior, and response provenance.
- Apply idempotency keys, bounded retries with backoff, rate limits, timeouts, circuit breakers, and cancellation.
- Record request metadata and result without sensitive payloads; attach evidence to the task correlation ID.
- Connector content is untrusted and cannot issue instructions or expand permissions.

## Initial connector categories

Source control, issue tracking, communication, calendars, documents, cloud providers, deployment targets, observability, identity, secrets, AI providers, and network-management systems. Each begins behind a feature flag and follows the same registry and approval rules.

## Failure behavior

Authentication, authorization, validation, policy, or integrity failures are terminal until corrected. Transient failures may retry within budget. Partial external writes are reconciled and surfaced; they are never reported as completed without remote verification. The kill switch must stop new invocations without erasing audit history.
