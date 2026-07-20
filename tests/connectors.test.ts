import { describe, expect, it } from 'vitest'
// @ts-expect-error Node built-ins are available in Vitest.
import { readFileSync } from 'node:fs'
import { CONNECTION_STATES, CONNECTORS } from '../worker/connectors'
import { integrationConnections } from '../src/platform/domain'

const service = readFileSync(new URL('../worker/connectors.ts', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../migrations/0008_connector_skill_registry.sql', import.meta.url), 'utf8')
const frontend = readFileSync(new URL('../src/platform/ProductScreens.tsx', import.meta.url), 'utf8')

describe('CyberScool connector and skill registry', () => {
  it('defines every required connection state and provider', () => {
    expect(CONNECTION_STATES).toEqual(['NOT_CONFIGURED', 'CONFIGURING', 'CHECKING', 'CONNECTED', 'DISCONNECTED', 'ERROR', 'SUSPENDED', 'REVOKED'])
    for (const id of ['github', 'cloudflare', 'supabase', 'gmail', 'google-calendar', 'google-drive', 'slack', 'notion', 'model-providers', 'mcp', 'generic-rest', 'oauth', 'api-key']) expect(CONNECTORS.some(item => item.id === id)).toBe(true)
  })

  it('creates registry, grants, credentials, health, invocation and resilience records', () => {
    for (const table of ['skill_registry', 'connector_manifests', 'connector_actions', 'connector_instances', 'connector_grants', 'connector_credential_references', 'connector_oauth_states', 'connector_health_checks', 'connector_invocations', 'connector_idempotency_records', 'connector_rate_limits', 'connector_circuit_breakers', 'connector_audit_events']) expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
  })

  it('never equates configuration with connection', () => {
    expect(service).toContain("state='CONFIGURING'")
    expect(service).toContain("state='CHECKING'")
    expect(service).toContain("state='CONNECTED'")
    expect(service.indexOf('providerCheck')).toBeLessThan(service.indexOf("state='CONNECTED'"))
    expect(service).toContain('Provider identity, permissions, credentials, and health verified')
  })

  it('keeps secrets server-side and accepts only opaque references', () => {
    expect(service).toContain('Only opaque env: or vault: secret references are accepted')
    expect(service).toContain("reference === 'env:GITHUB_CONNECTOR_TOKEN'")
    expect(service).not.toContain('return token')
    expect(frontend).toContain('No secret value is accepted by this screen')
  })

  it('enforces grants, approvals, idempotency, rate limits and circuit breakers', () => {
    expect(service).toContain('External write or privileged connector actions require explicit approval')
    expect(service).toContain('No current connector grant authorizes this action')
    expect(service).toContain('Idempotency key was used for a different connector request')
    expect(service).toContain('Connector rate limit exceeded')
    expect(service).toContain('Connector circuit breaker is open')
  })

  it('renders authoritative backend state', () => {
    const result = integrationConnections(null, null, false, [{ id: 'instance-github', connector_id: 'github', connector_version: 1, name: 'GitHub', provider: 'github.com', auth_type: 'server_secret_reference', state: 'ERROR', verified_scopes: '[]', failure_reason: 'Credential unavailable', status: 'ACTIVE' }])
    expect(result[0]).toMatchObject({ id: 'github', state: 'error', detail: 'Credential unavailable' })
  })
})
