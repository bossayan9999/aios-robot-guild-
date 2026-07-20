import { describe, expect, it } from 'vitest'
import { platformNavigation, routeFromHash } from '../src/platform/navigation'
import { connectionLabel, deriveCompletionGates, integrationConnections } from '../src/platform/domain'
import type { DeploymentHealth, Mission, MissionEvent, ReleaseCenterStatus } from '../src/types'

const mission = (status: string): Mission => ({ id: 'abc123def456', title: 'Verify platform', repository: 'https://github.com/example/project', status, plan: '1. Validate' })
const evidence: MissionEvent[] = [
  { agent: 'builder', event_type: 'root_inventory', message: 'Implementation evidence', progress: 60, evidence: 'files' },
  { agent: 'tester', event_type: 'readiness_check', message: 'Checks passed', progress: 80, evidence: 'tests' },
  { agent: 'reviewer', event_type: 'human_gate', message: 'Review complete', progress: 100 },
]

describe('CyberScool application shell', () => {
  it('provides typed navigation for every primary area, Guild View, and Settings', () => {
    expect(platformNavigation.map(item => item.id)).toEqual(['mission-control', 'copilot-manager', 'specialist-team', 'research-development', 'development-studio', 'network-center', 'integrations', 'runtime-center', 'audit-security', 'guild-view', 'settings'])
    expect(routeFromHash('#/runtime-center')).toBe('runtime-center')
    expect(routeFromHash('#/unknown')).toBe('mission-control')
  })

  it('keeps every completion gate locked before final verification', () => {
    const gates = deriveCompletionGates(mission('awaiting_approval'), [])
    expect(gates).toHaveLength(7)
    expect(gates.some(gate => gate.state === 'passed')).toBe(false)
    expect(gates.find(gate => gate.id === 'approval')?.state).toBe('active')
  })

  it('passes every completion gate only for a verified completed mission', () => {
    const gates = deriveCompletionGates(mission('completed'), evidence)
    expect(gates.every(gate => gate.state === 'passed')).toBe(true)
    expect(gates.map(gate => gate.id)).toEqual(['implementation', 'tests', 'validation', 'specialist_review', 'security_review', 'evidence', 'approval'])
  })

  it('fails evidence-dependent gates when a completed record lacks evidence', () => {
    expect(deriveCompletionGates(mission('completed'), []).some(gate => gate.state === 'failed')).toBe(true)
  })

  it('shows connected integrations only from verified backend state', () => {
    const health: DeploymentHealth = { ok: true, service: 'CyberScool', version: '1', build: 'test', checks: { worker: 'pass', assets: 'pass', database: 'pass' }, capabilities: { ai_provider: false, passkeys: true, pwa: true }, checked_at: '2026-07-20T00:00:00Z' }
    const releases: ReleaseCenterStatus = { mode: 'proposal_only', github_connected: false, cloudflare_connected: true, build: 'test' }
    const connections = integrationConnections(health, releases, true)
    expect(connections.find(item => item.id === 'cloudflare')?.state).toBe('connected')
    expect(connections.find(item => item.id === 'mcp')?.state).toBe('connected')
    expect(connections.find(item => item.id === 'github')?.state).toBe('not_configured')
    expect(connections.find(item => item.id === 'gmail')?.state).toBe('not_configured')
    expect(connections.find(item => item.id === 'model-providers')?.state).toBe('not_configured')
    expect(connectionLabel('not_configured')).toBe('Not configured')
  })
})
