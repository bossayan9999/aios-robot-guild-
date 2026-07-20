import type { AuthStatus, DeploymentHealth, ForgeProfile, OrchestrationDetails, OrchestrationPlan, ReleaseCenterStatus, SpecialistManifest, Task, TaskDetails, TaskGateType, TaskState } from '../types'

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly requestId?: string) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    throw new ApiError(String(payload.error || payload.detail || `Request failed (${response.status})`), response.status, response.headers.get('X-Request-ID') || undefined)
  }
  return payload as T
}

export const platformApi = {
  health: () => request<DeploymentHealth>('/api/health'),
  authStatus: () => request<AuthStatus>('/api/auth/status'),
  setup: (email: string, password: string) => request<{ ok: true }>('/api/auth/setup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => request<{ ok: true }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),
  copilot: (question: string) => request<{ answer: string; citations?: unknown[] }>('/api/copilot', { method: 'POST', body: JSON.stringify({ question }) }),
  copilotProfile: () => request<ForgeProfile>('/api/copilot/profile'),
  releaseStatus: () => request<ReleaseCenterStatus>('/api/releases/status'),
  mcp: () => request<{ name: string; tools: { name: string; description: string }[] }>('/mcp'),
  tasks: () => request<{ workspace_id: string; tasks: Task[] }>('/api/tasks'),
  task: (id: string) => request<TaskDetails>(`/api/tasks/${id}`),
  createTask: (title: string, description: string) => request<TaskDetails>('/api/tasks', { method: 'POST', body: JSON.stringify({ title, description }) }),
  savePlan: (id: string, content: string, materialChange = true) => request<TaskDetails>(`/api/tasks/${id}/plan`, { method: 'POST', body: JSON.stringify({ content, material_change: materialChange }) }),
  transitionTask: (id: string, toState: TaskState, reason: string, key: string) => request<{ task: Task; idempotent: boolean }>(`/api/tasks/${id}/transition`, { method: 'POST', body: JSON.stringify({ to_state: toState, reason, idempotency_key: key }) }),
  assignSpecialist: (id: string, specialistId: string) => request<{ ok: true }>(`/api/tasks/${id}/assignments`, { method: 'POST', body: JSON.stringify({ specialist_id: specialistId }) }),
  attachEvidence: (id: string, evidenceType: string, title: string, content: string) => request<{ id: string }>(`/api/tasks/${id}/evidence`, { method: 'POST', body: JSON.stringify({ evidence_type: evidenceType, title, content }) }),
  submitGate: (id: string, gateType: TaskGateType, evidenceId: string, reason: string) => request<{ ok: true }>(`/api/tasks/${id}/gates`, { method: 'POST', body: JSON.stringify({ gate_type: gateType, status: 'passed', evidence_id: evidenceId, reason }) }),
  specialistReview: (id: string, specialistId: string, findings: string) => request<{ ok: true }>(`/api/tasks/${id}/specialist-reviews`, { method: 'POST', body: JSON.stringify({ specialist_id: specialistId, decision: 'passed', findings }) }),
  securityReview: (id: string, findings: string) => request<{ ok: true }>(`/api/tasks/${id}/security-reviews`, { method: 'POST', body: JSON.stringify({ decision: 'passed', findings }) }),
  approveCompletion: (id: string, reason: string, key: string) => request<{ task: Task; idempotent: boolean }>(`/api/tasks/${id}/completion-approvals`, { method: 'POST', body: JSON.stringify({ decision: 'approved', reason, idempotency_key: key }) }),
  cancelTask: (id: string, reason: string, key: string) => request<{ task: Task; idempotent: boolean }>(`/api/tasks/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason, idempotency_key: key }) }),
  specialists: () => request<{ specialists: SpecialistManifest[] }>('/api/orchestration/specialists'),
  orchestration: (taskId: string) => request<OrchestrationDetails>(`/api/orchestration/tasks/${taskId}`),
  createObjective: (taskId: string, objective: string) => request<{ objective_id: string }>('/api/orchestration/objectives', { method: 'POST', body: JSON.stringify({ task_id: taskId, objective, constraints: ['Preserve working features', 'Require evidence and approvals'], unknowns: [], risk_level: 'medium' }) }),
  createOrchestrationPlan: (taskId: string, objectiveId: string, summary: string, steps: unknown[]) => request<{ plan_id: string; plan_version: number; status: string }>(`/api/orchestration/tasks/${taskId}/plan`, { method: 'POST', body: JSON.stringify({ objective_id: objectiveId, summary, risk_level: 'medium', steps }) }),
  approveOrchestrationPlan: (taskId: string) => request<{ ok: true; plan_version: number }>(`/api/orchestration/tasks/${taskId}/approve-plan`, { method: 'POST', body: '{}' }),
  createAssignment: (taskId: string, stepId: string, specialistId: string) => request<{ assignment_id: string; status: string }>(`/api/orchestration/tasks/${taskId}/assignments`, { method: 'POST', body: JSON.stringify({ step_id: stepId, specialist_id: specialistId, tools: [], connectors: [], runtimes: ['docker-sandbox'], data_scope: ['task'] }) }),
  finalReport: (taskId: string) => request<{ eligible: boolean; parent_task_state: TaskState; plan_version: number; reasons: string[]; summary: string }>(`/api/orchestration/tasks/${taskId}/final-report`),
  createCustomSpecialist: (input: Record<string, unknown>) => request<{ id: string; version: number; enabled: false }>('/api/orchestration/specialists/custom', { method: 'POST', body: JSON.stringify(input) }),
  currentOrchestrationPlan: (taskId: string) => request<{ plan: OrchestrationPlan | null }>(`/api/orchestration/tasks/${taskId}/plan`),
}
