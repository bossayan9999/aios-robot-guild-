# Structured Audit Logs

Build identifier: `2026.07.17-audit1`

AIOS emits one structured `aios.audit` event for every Worker request. Cloudflare Workers Logs can filter and group these records by action, status, outcome, route, build, mission, or request ID.

## Recorded fields

- Timestamp and request ID
- Build identifier
- Safe action name, HTTP method, and normalized route
- Status, outcome, and duration
- Mission ID for mission-scoped operations
- Approved or rejected decision for approval operations

## Privacy boundary

Audit records never include request or response bodies, Copilot prompts or answers, passwords, email addresses, cookies, authorization headers, API keys, session tokens, query strings, or source evidence.

Use the response `X-Request-ID` header to correlate a user-visible failure with its Cloudflare log event.

## Useful Cloudflare searches

- `aios.audit`
- `action = "mission.run"`
- `action = "mission.approval"`
- `status >= 400`
- `outcome = "error"`
