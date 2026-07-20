import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthStatus, DeploymentHealth, ForgeProfile, Mission, MissionEvent, ReleaseCenterStatus } from '../types'
import { platformApi } from './api'
import { deriveCompletionGates, integrationConnections, runtimeConnections } from './domain'

export function usePlatformState() {
  const [auth, setAuth] = useState<AuthStatus | null>(null)
  const [health, setHealth] = useState<DeploymentHealth | null>(null)
  const [releaseStatus, setReleaseStatus] = useState<ReleaseCenterStatus | null>(null)
  const [profile, setProfile] = useState<ForgeProfile | null>(null)
  const [missions, setMissions] = useState<Mission[]>([])
  const [activeMission, setActiveMission] = useState<Mission | null>(null)
  const [events, setEvents] = useState<MissionEvent[]>([])
  const [mcpVerified, setMcpVerified] = useState(false)
  const [terminalConnected, setTerminalConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadMission = useCallback(async (id: string) => {
    const result = await platformApi.mission(id)
    setActiveMission(result.mission)
    setEvents(result.events)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextAuth, nextHealth] = await Promise.all([platformApi.authStatus(), platformApi.health()])
      setAuth(nextAuth)
      setHealth(nextHealth)
      platformApi.mcp().then(() => setMcpVerified(true)).catch(() => setMcpVerified(false))
      fetch('http://127.0.0.1:4317/health').then(response => setTerminalConnected(response.ok)).catch(() => setTerminalConnected(false))
      if (nextAuth.authenticated) {
        const [missionResult, releases, nextProfile] = await Promise.all([platformApi.missions(), platformApi.releaseStatus(), platformApi.copilotProfile()])
        setMissions(missionResult.missions)
        setReleaseStatus(releases)
        setProfile(nextProfile)
        if (missionResult.missions[0]) await loadMission(missionResult.missions[0].id)
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Unable to load CyberScool')
    } finally {
      setLoading(false)
    }
  }, [loadMission])

  useEffect(() => { void refresh() }, [refresh])

  async function authenticate(mode: 'setup' | 'login', email: string, password: string) {
    setBusy(true); setError('')
    try {
      await platformApi[mode](email, password)
      await refresh()
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Authentication failed') }
    finally { setBusy(false) }
  }

  async function mutateMission(action: () => Promise<{ mission: Mission; events?: MissionEvent[] }>) {
    setBusy(true); setError('')
    try {
      const result = await action()
      setActiveMission(result.mission)
      if (result.events) setEvents(result.events)
      else await loadMission(result.mission.id)
      const list = await platformApi.missions()
      setMissions(list.missions)
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Task action failed') }
    finally { setBusy(false) }
  }

  const gates = useMemo(() => deriveCompletionGates(activeMission, events), [activeMission, events])
  const integrations = useMemo(() => integrationConnections(health, releaseStatus, mcpVerified), [health, releaseStatus, mcpVerified])
  const runtimes = useMemo(() => runtimeConnections(health, terminalConnected), [health, terminalConnected])

  return {
    auth, health, releaseStatus, profile, missions, activeMission, events, loading, busy, error,
    gates, integrations, runtimes, refresh, authenticate, loadMission,
    createMission: (title: string, repository: string) => mutateMission(() => platformApi.createMission(title, repository)),
    approveMission: (decision: 'approved' | 'rejected') => activeMission && mutateMission(() => platformApi.decideMission(activeMission.id, decision)),
    runMission: () => activeMission && mutateMission(() => platformApi.runMission(activeMission.id)),
    verifyMission: (decision: 'completed' | 'revision_requested') => activeMission && mutateMission(() => platformApi.verifyMission(activeMission.id, decision)),
    askCopilot: platformApi.copilot,
    logout: async () => { await platformApi.logout(); setActiveMission(null); setMissions([]); await refresh() },
  }
}

export type PlatformState = ReturnType<typeof usePlatformState>
