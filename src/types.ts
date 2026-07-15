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
