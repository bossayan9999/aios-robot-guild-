import type { ConnectorInstance, DeploymentHealth, ReleaseCenterStatus, TaskDetails, TaskGateType } from '../types'

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
  id: TaskGateType
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
  evidence_capture: 'Evidence capture',
  approvals: 'Required approvals',
}

export function taskCompletionGates(details: TaskDetails | null): CompletionGate[] {
  return (Object.keys(labels) as TaskGateType[]).map(id => {
    const gate = details?.gates.find(item => item.gate_type === id)
    const state: CompletionGate['state'] = gate?.status === 'passed' || gate?.status === 'not_applicable' ? 'passed' : gate?.status === 'failed' || gate?.status === 'invalidated' || details?.task.state === 'COMPLETED' ? 'failed' : details?.task.state === 'WAITING_FOR_COMPLETION_APPROVAL' ? 'active' : 'pending'
    return {
      id,
      label: labels[id],
      state,
      evidence: gate ? `${gate.status.replaceAll('_', ' ')} · plan v${gate.plan_version}${gate.reason ? ` · ${gate.reason}` : ''}` : 'Awaiting backend gate record',
    }
  })
}

export function integrationConnections(
  health: DeploymentHealth | null,
  releases: ReleaseCenterStatus | null,
  mcpVerified: boolean,
  registry?: ConnectorInstance[],
): ConnectionRecord[] {
  if (registry) return registry.map(item => ({
    id: item.connector_id,
    name: item.name,
    category: 'integration',
    state: item.state === 'CONNECTED' ? 'connected' : item.state === 'CHECKING' || item.state === 'CONFIGURING' ? 'checking' : item.state === 'NOT_CONFIGURED' ? 'not_configured' : item.state === 'ERROR' ? 'error' : 'disconnected',
    detail: item.state === 'CONNECTED' ? `${item.provider_identity || item.provider} verified with ${JSON.parse(item.verified_scopes || '[]').join(', ') || 'provider-authorized access'}` : item.failure_reason || `${item.name} is ${item.state.toLowerCase().replaceAll('_', ' ')}`,
    verifiedAt: item.last_verified_at,
  }))
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
