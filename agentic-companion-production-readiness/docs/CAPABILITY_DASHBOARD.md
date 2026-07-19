# Capability Dashboard Contract

The web dashboard should render capability state from config/capabilities.json instead of hard-coded claims.

## Status meanings

- planned: specified but not implemented
- active: implemented and currently available
- degraded: available with a known failure or dependency issue
- blocked: unavailable until a requirement or approval is satisfied
- retired: intentionally disabled

## Required dashboard panels

1. System health: cloud API, database, queue, AI provider and local companion.
2. Device pairing: device name, last seen, pairing expiry and revoke control.
3. Mission activity: current stage, assigned specialist, evidence, retry count and elapsed time.
4. Approval inbox: exact action, reason, affected resource, risk and expiry.
5. Security boundary: project root, command allowlist, network policy and emergency stop.
6. Release evidence: commit, tests, migration status, deployment version and rollback target.

## Trust rule

The UI must never display a capability as active only because an AI model says it is active. Active state requires a signed or authenticated backend health result.

## Game-style presentation

Robots may visualize real agent stages, XP and tools, but rewards are granted only after objective completion checks pass. Animation must reflect backend events rather than simulate progress.
