import { describe, expect, it } from 'vitest'
import { platformNavigation, routeFromHash } from '../src/platform/navigation'
import { connectionLabel, integrationConnections, taskCompletionGates } from '../src/platform/domain'
import type { DeploymentHealth, ReleaseCenterStatus, TaskDetails, TaskGateType, TaskState } from '../src/types'

const details = (state: TaskState, passed = false): TaskDetails => ({
  task: { id: 'abc123def4567890', user_id: 1, workspace_id: 'owner-1', title: 'Verify platform', description: 'Test task', state, current_plan_version: 1, correlation_id: 'corr', created_at: '2026-07-21', updated_at: '2026-07-21' },
  plans: [], steps: [], dependencies: [], events: [], assignments: [], evidence: [], specialist_reviews: [], security_reviews: [], completion_approvals: [],
  gates: (['implementation', 'tests', 'validation', 'specialist_review', 'security_review', 'evidence_capture', 'approvals'] as TaskGateType[]).map((gate_type, index) => ({ id: index, task_id: 'abc123def4567890', workspace_id: 'owner-1', gate_type, status: passed ? 'passed' : 'pending', applicable: 1, reason: '', plan_version: 1, updated_at: '2026-07-21' })),
})

describe('CyberScool application shell', () => {
  it('provides typed navigation for every primary area, Guild View, and Settings', () => {
    expect(platformNavigation.map(item => item.id)).toEqual(['mission-control', 'copilot-manager', 'specialist-team', 'research-development', 'development-studio', 'network-center', 'integrations', 'runtime-center', 'audit-security', 'guild-view', 'settings'])
    expect(routeFromHash('#/runtime-center')).toBe('runtime-center')
    expect(routeFromHash('#/unknown')).toBe('mission-control')
  })

  it('keeps every completion gate locked before final verification', () => {
    const gates = taskCompletionGates(details('WAITING_FOR_APPROVAL'))
    expect(gates).toHaveLength(7)
    expect(gates.some(gate => gate.state === 'passed')).toBe(false)
    expect(gates.find(gate => gate.id === 'approvals')?.state).toBe('pending')
  })

  it('passes every completion gate only for a verified completed mission', () => {
    const gates = taskCompletionGates(details('COMPLETED', true))
    expect(gates.every(gate => gate.state === 'passed')).toBe(true)
    expect(gates.map(gate => gate.id)).toEqual(['implementation', 'tests', 'validation', 'specialist_review', 'security_review', 'evidence_capture', 'approvals'])
  })

  it('fails evidence-dependent gates when a completed record lacks evidence', () => {
    expect(taskCompletionGates(details('COMPLETED')).some(gate => gate.state === 'failed')).toBe(true)
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
