import type { DeploymentHealth, Mission, MissionEvent, ReleaseCenterStatus } from '../types'

export type ConnectionState = 'connected' | 'disconnected' | 'not_configured' | 'checking' | 'error'

export interface ConnectionRecord {
  id: string
  name: string
  category: 'integration' | 'runtime'
  state: ConnectionState
  detail: string
  verifiedAt?: string
}

export interface CompletionGate {
  id: 'implementation' | 'tests' | 'validation' | 'specialist_review' | 'security_review' | 'evidence' | 'approval'
  label: string
  state: 'passed' | 'active' | 'pending' | 'failed'
  evidence: string
}

const labels: Record<CompletionGate['id'], string> = {
  implementation: 'Implementation',
  tests: 'Tests',
  validation: 'Validation',
  specialist_review: 'Specialist review',
  security_review: 'Security review',
  evidence: 'Evidence capture',
  approval: 'Required approvals',
}

export function deriveCompletionGates(mission: Mission | null, events: MissionEvent[]): CompletionGate[] {
  const status = mission?.status || 'draft'
  const completed = status === 'completed'
  const reviewReady = ['review_required', 'completed'].includes(status)
  const approved = ['approved', 'running', 'review_required', 'completed'].includes(status)
  const hasEvidence = events.some(event => Boolean(event.evidence) || ['quality', 'review', 'complete'].some(term => event.event_type.includes(term)))
  const hasImplementation = events.some(event => event.agent === 'builder')
  const hasTest = events.some(event => event.agent === 'tester')
  const hasReview = events.some(event => event.agent === 'reviewer')
  const failed = status === 'failed'
  const values: Record<CompletionGate['id'], CompletionGate['state']> = {
    implementation: failed || (completed && !hasImplementation) ? 'failed' : hasImplementation ? 'passed' : status === 'running' ? 'active' : 'pending',
    tests: failed || (completed && !hasTest) ? 'failed' : hasTest ? 'passed' : status === 'running' ? 'active' : 'pending',
    validation: failed || (completed && !hasTest) ? 'failed' : hasTest ? 'passed' : status === 'running' ? 'active' : 'pending',
    specialist_review: completed && !hasReview ? 'failed' : completed && hasReview ? 'passed' : reviewReady ? 'active' : 'pending',
    security_review: completed && !hasReview ? 'failed' : completed && hasReview ? 'passed' : reviewReady ? 'active' : 'pending',
    evidence: completed && !hasEvidence ? 'failed' : hasEvidence ? 'passed' : reviewReady ? 'active' : 'pending',
    approval: completed ? 'passed' : status === 'awaiting_approval' || reviewReady ? 'active' : approved ? 'passed' : 'pending',
  }
  return (Object.keys(labels) as CompletionGate['id'][]).map(id => ({
    id,
    label: labels[id],
    state: values[id],
    evidence: gateEvidence(id, mission, events),
  }))
}

function gateEvidence(id: CompletionGate['id'], mission: Mission | null, events: MissionEvent[]) {
  if (!mission) return 'No active task'
  if (id === 'evidence') return events.length ? `${events.length} recorded task event${events.length === 1 ? '' : 's'}` : 'No evidence recorded'
  if (id === 'approval') return mission.status === 'completed' ? 'Owner completion approval recorded' : mission.status === 'awaiting_approval' ? 'Owner decision required' : 'Initial approval state recorded'
  if (id === 'specialist_review') return events.some(event => event.agent === 'reviewer') ? 'Reviewer handoff recorded' : 'Reviewer handoff pending'
  if (id === 'security_review') return events.some(event => event.agent === 'reviewer') ? 'Read-only scope review recorded' : 'Security review required before completion'
  return mission.status === 'completed' ? 'Verified task result' : `Task state: ${mission.status.replaceAll('_', ' ')}`
}

export function integrationConnections(
  health: DeploymentHealth | null,
  releases: ReleaseCenterStatus | null,
  mcpVerified: boolean,
): ConnectionRecord[] {
  const verifiedAt = health?.checked_at
  return [
    { id: 'github', name: 'GitHub', category: 'integration', state: releases?.github_connected ? 'connected' : 'not_configured', detail: releases?.github_connected ? 'Repository-scoped GitHub App verified' : 'GitHub App is not configured', verifiedAt },
    { id: 'cloudflare', name: 'Cloudflare', category: 'integration', state: releases?.cloudflare_connected && health?.ok ? 'connected' : health ? 'disconnected' : 'checking', detail: releases?.cloudflare_connected && health?.ok ? 'Worker and D1 health verified' : 'Backend verification unavailable', verifiedAt },
    { id: 'supabase', name: 'Supabase', category: 'integration', state: 'not_configured', detail: 'No backend connector is implemented' },
    { id: 'gmail', name: 'Gmail', category: 'integration', state: 'not_configured', detail: 'No backend connector is implemented' },
    { id: 'calendar', name: 'Calendar', category: 'integration', state: 'not_configured', detail: 'No backend connector is implemented' },
    { id: 'drive', name: 'Drive', category: 'integration', state: 'not_configured', detail: 'No backend connector is implemented' },
    { id: 'slack', name: 'Slack', category: 'integration', state: 'not_configured', detail: 'No backend connector is implemented' },
    { id: 'notion', name: 'Notion', category: 'integration', state: 'not_configured', detail: 'No backend connector is implemented' },
    { id: 'model-providers', name: 'OpenAI / model providers', category: 'integration', state: health?.capabilities?.ai_provider ? 'connected' : 'not_configured', detail: health?.capabilities?.ai_provider ? 'Server-side AI provider verified' : 'No server-side model credential is configured', verifiedAt: health?.capabilities?.ai_provider ? verifiedAt : undefined },
    { id: 'mcp', name: 'MCP', category: 'integration', state: mcpVerified ? 'connected' : 'disconnected', detail: mcpVerified ? 'Metadata endpoint verified' : 'MCP metadata endpoint unavailable', verifiedAt },
    { id: 'custom', name: 'Custom REST / OAuth / API key', category: 'integration', state: 'not_configured', detail: 'Plugin registry backend task required' },
  ]
}

export function runtimeConnections(health: DeploymentHealth | null, terminalConnected: boolean): ConnectionRecord[] {
  const workerConnected = Boolean(health?.ok && health.checks?.worker === 'pass')
  return [
    { id: 'local-agent', name: 'Local PC agent', category: 'runtime', state: terminalConnected ? 'connected' : 'disconnected', detail: terminalConnected ? 'Loopback companion verified' : 'Local companion is not paired' },
    { id: 'unix-agent', name: 'Linux / macOS agent', category: 'runtime', state: 'not_configured', detail: 'No cross-platform runtime agent is enrolled' },
    { id: 'docker', name: 'Docker sandbox', category: 'runtime', state: 'not_configured', detail: 'No runtime registry API is implemented' },
    { id: 'vps', name: 'VPS', category: 'runtime', state: 'not_configured', detail: 'No runtime enrollment is configured' },
    { id: 'private-server', name: 'Private server', category: 'runtime', state: 'not_configured', detail: 'No runtime enrollment is configured' },
    { id: 'cloud-worker', name: 'Cloud worker', category: 'runtime', state: workerConnected ? 'connected' : health ? 'disconnected' : 'checking', detail: workerConnected ? 'Cloudflare Worker health verified' : 'Worker health unavailable', verifiedAt: health?.checked_at },
    { id: 'network-agent', name: 'Network agent', category: 'runtime', state: 'not_configured', detail: 'No authorized network runtime is enrolled' },
    { id: 'mobile', name: 'Mobile paired devices', category: 'runtime', state: 'not_configured', detail: 'Device pairing registry backend task required' },
  ]
}

export function connectionLabel(state: ConnectionState) {
  return state === 'not_configured' ? 'Not configured' : state.charAt(0).toUpperCase() + state.slice(1)
}
