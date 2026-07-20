import type { AuthStatus, DeploymentHealth, ForgeProfile, Mission, MissionEvent, ReleaseCenterStatus } from '../types'

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
  missions: () => request<{ missions: Mission[] }>('/api/missions'),
  mission: (id: string) => request<{ mission: Mission; events: MissionEvent[] }>(`/api/missions/${id}`),
  createMission: (title: string, repository: string) => request<{ mission: Mission; events: MissionEvent[] }>('/api/missions', { method: 'POST', body: JSON.stringify({ title, repository }) }),
  decideMission: (id: string, decision: 'approved' | 'rejected') => request<{ mission: Mission }>(`/api/missions/${id}/approval`, { method: 'POST', body: JSON.stringify({ decision }) }),
  runMission: (id: string) => request<{ mission: Mission; events: MissionEvent[] }>(`/api/missions/${id}/run`, { method: 'POST' }),
  verifyMission: (id: string, decision: 'completed' | 'revision_requested') => request<{ mission: Mission; events: MissionEvent[] }>(`/api/missions/${id}/verification`, { method: 'POST', body: JSON.stringify({ decision }) }),
  copilot: (question: string) => request<{ answer: string; citations?: unknown[] }>('/api/copilot', { method: 'POST', body: JSON.stringify({ question }) }),
  copilotProfile: () => request<ForgeProfile>('/api/copilot/profile'),
  releaseStatus: () => request<ReleaseCenterStatus>('/api/releases/status'),
  mcp: () => request<{ name: string; tools: { name: string; description: string }[] }>('/mcp'),
}
