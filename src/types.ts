export type AgentId = 'router' | 'planner' | 'builder' | 'tester' | 'reviewer'
export type StageState = 'queued' | 'active' | 'passed' | 'failed'

export type TaskState = 'CREATED' | 'PLANNING' | 'WAITING_FOR_APPROVAL' | 'ASSIGNED' | 'SANDBOX_PROVISIONING' | 'RUNNING' | 'TESTING' | 'REVIEWING' | 'REPAIRING' | 'VALIDATING' | 'STAGING' | 'SECURITY_REVIEW' | 'WAITING_FOR_COMPLETION_APPROVAL' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'CANCELLED' | 'ROLLED_BACK'
export type TaskGateType = 'implementation' | 'tests' | 'validation' | 'specialist_review' | 'security_review' | 'evidence_capture' | 'approvals'

export interface Task {
  id: string
  user_id: number
  workspace_id: string
  title: string
  description: string
  state: TaskState
  current_plan_version: number
  correlation_id: string
  created_at: string
  updated_at: string
}

export interface TaskPlanVersion { id: number; task_id: string; version: number; content: string; material_change: number; created_by: number; created_at: string }
export interface TaskStateEvent { id: number; task_id: string; workspace_id: string; from_state?: TaskState; to_state: TaskState; actor_user_id: number; reason: string; plan_version: number; correlation_id: string; idempotency_key: string; created_at: string }
export interface TaskAssignment { id: number; task_id: string; workspace_id: string; specialist_id: string; plan_version: number; status: string; created_at: string }
export interface TaskGate { id: number; task_id: string; workspace_id: string; gate_type: TaskGateType; status: 'pending' | 'passed' | 'failed' | 'not_applicable' | 'invalidated'; applicable: number; evidence_id?: string; reason: string; plan_version: number; updated_at: string }
export interface TaskEvidence { id: string; task_id: string; workspace_id: string; evidence_type: string; title: string; content: string; uri?: string; sha256?: string; plan_version: number; created_at: string }
export interface TaskDetails { task: Task; plans: TaskPlanVersion[]; steps: unknown[]; dependencies: unknown[]; events: TaskStateEvent[]; assignments: TaskAssignment[]; gates: TaskGate[]; evidence: TaskEvidence[]; specialist_reviews: unknown[]; security_reviews: unknown[]; completion_approvals: unknown[] }

export type AssignmentState = 'PROPOSED' | 'WAITING_FOR_APPROVAL' | 'ASSIGNED' | 'RUNNING' | 'WAITING_FOR_INPUT' | 'REVIEWING' | 'REPAIRING' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'CANCELLED'
export interface SpecialistManifest { id: string; version: number; name: string; role: string; instructions: string; risk_level: string; enabled: number; allowed_tools: string; allowed_connectors: string; allowed_runtimes: string; approval_requirements: string; status: string }
export interface SpecialistEvaluation { id: string; specialist_id: string; specialist_version: number; score: number; passed: number; evaluator_specialist_id: string; status: string; created_at: string }
export interface SpecialistCapabilityGrant { id: string; specialist_id: string; specialist_version: number; task_id: string; status: string; expires_at: string; revoked_at?: string }
export interface SpecialistRuntimeRegistry { manifests: SpecialistManifest[]; evaluations: SpecialistEvaluation[]; grants: SpecialistCapabilityGrant[]; suspensions: Record<string, unknown>[] }
export type ConnectorState = 'NOT_CONFIGURED' | 'CONFIGURING' | 'CHECKING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'SUSPENDED' | 'REVOKED'
export interface ConnectorInstance { id: string; connector_id: string; connector_version: number; name: string; provider: string; auth_type: string; state: ConnectorState; provider_identity?: string; verified_scopes: string; last_verified_at?: string; failure_reason?: string; status: string }
export interface ConnectorRegistry { connectors: ConnectorInstance[] }
export interface RuntimeIdentity { id: string; profile_id: string; profile_version: number; display_name: string; state: 'DISCONNECTED' | 'CONNECTED' | 'DEGRADED' | 'SUSPENDED' | 'REVOKED'; capability_version: number; enrolled_at: string; last_heartbeat_at?: string; suspended_at?: string; revoked_at?: string }
export interface RuntimeProfile { id: string; version: number; name: string; sandbox_strength: string; default_actions_json: string; status: string }
export interface RuntimeLease { id: string; runtime_id: string; task_id: string; action: string; status: string; expires_at: string; created_at: string }
export interface RuntimeRegistry { profiles: RuntimeProfile[]; runtimes: RuntimeIdentity[]; leases: RuntimeLease[]; emergency_stops: Record<string, unknown>[]; heartbeat_fresh_seconds: number }
export interface OrchestrationPlan { id: string; task_id: string; plan_version: number; summary: string; risk_level: string; status: string; approved_at?: string }
export interface OrchestrationStep { id: string; plan_id: string; plan_version: number; position: number; title: string; description: string; dependencies_json: string; accountable_specialist_id: string; acceptance_criteria: string; evidence_requirements: string; rollback_requirements: string; status: string }
export interface SpecialistAssignmentRecord { id: string; plan_step_id: string; specialist_id: string; specialist_version: number; plan_version: number; status: AssignmentState; retry_count: number; retry_limit: number; evidence_refs: string }
export interface OrchestrationEvent { id: number; task_id: string; plan_version: number; event_type: string; target_type: string; target_id: string; status: string; detail: string; evidence_refs: string; correlation_id: string; created_at: string }
export interface OrchestrationDetails { task: Task; copilot_sessions: Record<string, unknown>[]; copilot_objectives: Record<string, unknown>[]; task_plans: OrchestrationPlan[]; plan_steps: OrchestrationStep[]; specialist_assignments: SpecialistAssignmentRecord[]; specialist_handoffs: Record<string, unknown>[]; specialist_results: Record<string, unknown>[]; review_findings: Record<string, unknown>[]; conflict_records: Record<string, unknown>[]; escalation_requests: Record<string, unknown>[]; orchestration_events: OrchestrationEvent[] }

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

export interface DeploymentHealth {
  ok: boolean
  service: string
  version: string
  build: string
  checks: { worker: string; assets: string; database?: string }
  capabilities?: { ai_provider: boolean; passkeys: boolean; pwa: boolean; task_engine?: boolean; orchestration?: boolean; specialist_runtime?: boolean; connector_registry?: boolean; execution_runtimes?: boolean }
  checked_at: string
  request_id?: string
}

export interface ReleaseProposal {
  id: string
  title: string
  goal: string
  status: string
  plan: string
  risk: string
  created_at: string
  updated_at: string
}

export interface ReleaseEvent {
  id: number
  proposal_id: string
  stage: string
  event_type: string
  message: string
  created_at: string
}

export interface ReleaseCenterStatus {
  mode: 'proposal_only' | 'github_app_ready'
  github_connected: boolean
  cloudflare_connected: boolean
  build: string
}

export interface ForgeProfile {
  level: number
  xp: number
  next_level_xp: number
  verified_missions: number
  memory_records: number
  recorded_handoffs: number
  skills: string[]
  specialists: EngineeringSpecialist[]
  guild_tokens: number
  tool_badges: string[]
}

export interface EngineeringSpecialist {
  id: AgentId
  name: string
  role: string
  xp: number
  level: number
  rank: 'Apprentice' | 'Junior' | 'Specialist' | 'Senior' | 'Lead' | 'Principal' | 'Guild Master'
  completed_missions: number
  skills: string[]
  disciplines: string[]
}
