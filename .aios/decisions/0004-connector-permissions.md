# ADR 0004: Connector Permissions and Verification

Status: Accepted

## Decision

Connector installation and connector authorization are separate. Each organization/workspace grant identifies allowed actions, resources, data classes, actor/task scope, expiry, and credential reference. External writes and destructive operations require scoped approval.

A connector is `connected` only after the backend verifies credentials, permissions, provider identity, and health. Configuration, installation, or a stored key alone is not proof of connection.

## Consequences

- Permission expansion or connector upgrade returns the connector to review.
- Every call is rate-limited, schema-validated, tenant-scoped, audited, and revocable.
- Provider content remains untrusted and cannot issue policy instructions.
