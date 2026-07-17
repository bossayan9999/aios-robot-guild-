# AIOS Update Center v1

The Update Center converts an owner goal into a durable, approval-gated release proposal.

## What v1 does

- Stores proposals and event evidence in owner-scoped D1 tables.
- Generates a fixed safety-first release plan.
- Records explicit approve or reject decisions in structured audit logs.
- Shows GitHub App and Cloudflare readiness without exposing secrets.
- Advertises the release workflow through MCP metadata.

## What v1 intentionally does not do

It does not edit source, create a branch, open a pull request, merge, or deploy. An approval moves the proposal to `approved_waiting_connection` until a repository-scoped GitHub App is installed and its executor has been separately implemented and tested.

## Production migration

Run `migrations/0004_release_center.sql` against the existing `aios-robot-guild` D1 database before deploying this build. If password change and passkeys have not been deployed, run `migrations/0003_passkeys.sql` first.

## Future executor contract

The future GitHub executor must use short-lived installation tokens, a new branch for every proposal, required CI checks, owner review, no direct push to `main`, no automatic merge, and an immutable release audit trail.
