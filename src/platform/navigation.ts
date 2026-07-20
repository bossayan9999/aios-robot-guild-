export type PlatformRoute =
  | 'mission-control'
  | 'copilot-manager'
  | 'specialist-team'
  | 'research-development'
  | 'development-studio'
  | 'network-center'
  | 'integrations'
  | 'runtime-center'
  | 'audit-security'
  | 'guild-view'
  | 'settings'

export interface NavigationItem {
  id: PlatformRoute
  label: string
  shortLabel: string
  icon: string
  description: string
}

export const platformNavigation: NavigationItem[] = [
  { id: 'mission-control', label: 'Mission Control', shortLabel: 'Mission', icon: 'MC', description: 'Tasks, gates, approvals and evidence' },
  { id: 'copilot-manager', label: 'Copilot Manager', shortLabel: 'Copilot', icon: 'CM', description: 'Plan and coordinate verified work' },
  { id: 'specialist-team', label: 'Specialist Team', shortLabel: 'Team', icon: 'ST', description: 'Capability and assignment registry' },
  { id: 'research-development', label: 'Research & Development', shortLabel: 'R&D', icon: 'RD', description: 'Sources, experiments and decisions' },
  { id: 'development-studio', label: 'Development Studio', shortLabel: 'Studio', icon: 'DS', description: 'Repository, terminal, builds and GitHub' },
  { id: 'network-center', label: 'Network Center', shortLabel: 'Network', icon: 'NC', description: 'Read-only network operations' },
  { id: 'integrations', label: 'Integrations', shortLabel: 'Connect', icon: 'IN', description: 'Verified external connections' },
  { id: 'runtime-center', label: 'Runtime Center', shortLabel: 'Runtime', icon: 'RT', description: 'Local and remote execution health' },
  { id: 'audit-security', label: 'Audit & Security', shortLabel: 'Security', icon: 'AS', description: 'Policy, approvals and emergency controls' },
  { id: 'guild-view', label: 'Guild View', shortLabel: 'Guild', icon: 'GV', description: 'Optional 3D Robot Guild experience' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: 'SE', description: 'Workspace and security preferences' },
]

export function isPlatformRoute(value: string): value is PlatformRoute {
  return platformNavigation.some(item => item.id === value)
}

export function routeFromHash(hash: string): PlatformRoute {
  const candidate = hash.replace(/^#\/?/, '')
  return isPlatformRoute(candidate) ? candidate : 'mission-control'
}
