# Connector Backlog

Phase 6 status: core registry, skill manifests, scoped grants, secret references, OAuth state, verification, rate limits, retries, circuit breaking, idempotency, audit, and revocation are implemented and locally validated. GitHub and Cloudflare adapters are ready for live verification when owner-managed server secrets are configured; local evidence intentionally verifies their missing-secret failure state.

- Build skill and connector registries with versioning, integrity, permission scopes, health, revocation, rate limits, and audit logs.
- Add OAuth, API-key, MCP, and custom REST authentication without exposing credentials to clients or models.
- Implement GitHub and Cloudflare first, followed by Supabase, Gmail, Google Calendar, Google Drive, Slack, Notion, and model providers.
- Add idempotency, bounded retries, circuit breaking, secret rotation, provider identity checks, and negative permission tests.

Installation is not authorization, and stored credentials are not verified connectivity.

Deferred adapters: Supabase, Gmail, Google Calendar, Google Drive, Slack, Notion, model-provider, and generic REST execution remain `NOT_CONFIGURED` until provider-specific identity, scope, health, and revocation contracts are implemented and tested with approved credentials.
