export type AgentId = 'router' | 'planner' | 'builder' | 'tester' | 'reviewer'
export type StageState = 'queued' | 'active' | 'passed' | 'failed'

export interface Agent {
  id: AgentId
  name: string
  role: string
  skill: string
  color: string
  icon: string
}

export interface MissionEvent {
  id?: number
  mission_id?: string
  agent: AgentId
  event_type: string
  message: string
  progress: number
  evidence?: string
  created_at?: string
}

export interface Mission {
  id: string
  title: string
  repository: string
  status: string
  plan: string
  result?: string
  created_at?: string
}

export interface AuthStatus {
  authenticated: boolean
  setup_required: boolean
  email?: string
}

export interface KnowledgeHit {
  id: string
  document_id: string
  title: string
  source_type: string
  source_uri: string
  trust_state: string
  content: string
  score: number
}

export interface DeviceDiagnostics {
  scannedAt: string
  device: { name: string; platform: string; release: string; arch: string; cpuCores: number; totalMemoryBytes: number; freeMemoryBytes: number; uptimeSeconds: number }
  project: { path: string; gitRoot: string | null; branch: string | null; clean: boolean; packageFound: boolean }
  tools: { node: string; npm: string | null; git: string | null }
  securityTools: { id: string; name: string; installed: boolean; version: string | null; purpose: string; recommended: boolean }[]
  checks: { id: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string }[]
  summary: string
}

export interface SecurityLabStatus {
  dockerReady: boolean
  dockerVersion: string | null
  active: boolean
  expiresAt: string | null
  allowlist: string[]
  externalNetwork: string
  audit: { at?: string; action: string; [key: string]: unknown }[]
  containers: string
}
