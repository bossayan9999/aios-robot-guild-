import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthStatus, DeploymentHealth, ForgeProfile, OrchestrationDetails, ReleaseCenterStatus, SpecialistManifest, SpecialistRuntimeRegistry, Task, TaskDetails, TaskState } from '../types'
import { platformApi } from './api'
import { taskCompletionGates, integrationConnections, runtimeConnections } from './domain'

const operationKey = (action: string) => `${action}-${crypto.randomUUID()}`

export function usePlatformState() {
  const [auth, setAuth] = useState<AuthStatus | null>(null)
  const [health, setHealth] = useState<DeploymentHealth | null>(null)
  const [releaseStatus, setReleaseStatus] = useState<ReleaseCenterStatus | null>(null)
  const [profile, setProfile] = useState<ForgeProfile | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskDetails, setTaskDetails] = useState<TaskDetails | null>(null)
  const [orchestration, setOrchestration] = useState<OrchestrationDetails | null>(null)
  const [specialists, setSpecialists] = useState<SpecialistManifest[]>([])
  const [specialistRuntime, setSpecialistRuntime] = useState<SpecialistRuntimeRegistry | null>(null)
  const [finalReport, setFinalReport] = useState<{ eligible: boolean; reasons: string[]; summary: string } | null>(null)
  const [mcpVerified, setMcpVerified] = useState(false)
  const [terminalConnected, setTerminalConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadTask = useCallback(async (taskId: string) => {
    const [details, orchestrationDetails] = await Promise.all([platformApi.task(taskId), platformApi.orchestration(taskId)])
    setTaskDetails(details); setOrchestration(orchestrationDetails)
    setFinalReport(await platformApi.finalReport(taskId))
  }, [])

  const refreshTasks = useCallback(async () => {
    const result = await platformApi.tasks()
    setTasks(result.tasks)
    if (result.tasks[0]) await loadTask(result.tasks[0].id)
    else setTaskDetails(null)
  }, [loadTask])

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [nextAuth, nextHealth] = await Promise.all([platformApi.authStatus(), platformApi.health()])
      setAuth(nextAuth); setHealth(nextHealth)
      platformApi.mcp().then(() => setMcpVerified(true)).catch(() => setMcpVerified(false))
      fetch('http://127.0.0.1:4317/health').then(response => setTerminalConnected(response.ok)).catch(() => setTerminalConnected(false))
      if (nextAuth.authenticated) {
        const [taskResult, releases, nextProfile, registry, runtimeRegistry] = await Promise.all([platformApi.tasks(), platformApi.releaseStatus(), platformApi.copilotProfile(), platformApi.specialists(), platformApi.specialistRuntimeRegistry()])
        setTasks(taskResult.tasks); setReleaseStatus(releases); setProfile(nextProfile); setSpecialists(registry.specialists); setSpecialistRuntime(runtimeRegistry)
        if (taskResult.tasks[0]) await loadTask(taskResult.tasks[0].id)
      }
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Unable to load CyberScool') }
    finally { setLoading(false) }
  }, [loadTask])

  useEffect(() => { void refresh() }, [refresh])

  async function authenticate(mode: 'setup' | 'login', email: string, password: string) {
    setBusy(true); setError('')
    try { await platformApi[mode](email, password); await refresh() }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Authentication failed') }
    finally { setBusy(false) }
  }

  async function taskAction(action: () => Promise<unknown>) {
    if (!taskDetails) return
    setBusy(true); setError('')
    try { await action(); await refreshTasks() }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Task action failed') }
    finally { setBusy(false) }
  }

  async function createTask(title: string, description: string) {
    setBusy(true); setError('')
    try { const created = await platformApi.createTask(title, description); setTaskDetails(created); await refreshTasks() }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Task creation failed') }
    finally { setBusy(false) }
  }

  const activeTask = taskDetails?.task || null
  const gates = useMemo(() => taskCompletionGates(taskDetails), [taskDetails])
  const integrations = useMemo(() => integrationConnections(health, releaseStatus, mcpVerified), [health, releaseStatus, mcpVerified])
  const runtimes = useMemo(() => runtimeConnections(health, terminalConnected), [health, terminalConnected])

  return {
    auth, health, releaseStatus, profile, tasks, taskDetails, orchestration, specialists, specialistRuntime, finalReport, activeTask, events: taskDetails?.events || [], loading, busy, error,
    gates, integrations, runtimes, refresh, authenticate, loadTask, createTask,
    savePlan: (content: string) => activeTask && taskAction(() => platformApi.savePlan(activeTask.id, content)),
    transitionTask: (to: TaskState, reason: string) => activeTask && taskAction(() => platformApi.transitionTask(activeTask.id, to, reason, operationKey(`transition-${to}`))),
    assignSpecialist: (specialist: string) => activeTask && taskAction(() => platformApi.assignSpecialist(activeTask.id, specialist)),
    approvePlanAndAssign: () => activeTask && taskAction(async () => {
      await platformApi.assignSpecialist(activeTask.id, 'tech-development')
      await platformApi.transitionTask(activeTask.id, 'ASSIGNED', 'Owner approved plan and assigned Tech Development.', operationKey('plan-approval'))
    }),
    attachAndPassCoreGates: () => activeTask && taskAction(async () => {
      const evidence = await platformApi.attachEvidence(activeTask.id, 'validation_report', 'Task validation evidence', `State ${activeTask.state}; plan version ${activeTask.current_plan_version}; owner-reviewed validation evidence.`)
      for (const gate of ['implementation', 'tests', 'validation', 'evidence_capture'] as const) await platformApi.submitGate(activeTask.id, gate, evidence.id, `${gate.replaceAll('_', ' ')} evidence verified`)
    }),
    submitSpecialistReview: () => activeTask && taskAction(() => platformApi.specialistReview(activeTask.id, 'tech-development', 'Implementation and test evidence reviewed.')),
    submitSecurityReview: () => activeTask && taskAction(() => platformApi.securityReview(activeTask.id, 'Authorization, evidence, secrets, and completion controls reviewed.')),
    reviewAndValidate: () => activeTask && taskAction(async () => {
      await platformApi.specialistReview(activeTask.id, 'tech-development', 'Implementation and test evidence reviewed.')
      await platformApi.transitionTask(activeTask.id, 'VALIDATING', 'Specialist review passed; validation started.', operationKey('validation'))
    }),
    validateAndRequestSecurityReview: () => activeTask && taskAction(async () => {
      const evidence = await platformApi.attachEvidence(activeTask.id, 'validation_report', 'Task validation evidence', `State ${activeTask.state}; plan version ${activeTask.current_plan_version}; validation evidence accepted.`)
      for (const gate of ['implementation', 'tests', 'validation', 'evidence_capture'] as const) await platformApi.submitGate(activeTask.id, gate, evidence.id, `${gate.replaceAll('_', ' ')} evidence verified`)
      await platformApi.transitionTask(activeTask.id, 'SECURITY_REVIEW', 'Validation gates passed; security review started.', operationKey('security-review'))
    }),
    passSecurityReview: () => activeTask && taskAction(async () => {
      await platformApi.securityReview(activeTask.id, 'Authorization, evidence, secrets, and completion controls reviewed.')
      await platformApi.transitionTask(activeTask.id, 'WAITING_FOR_COMPLETION_APPROVAL', 'Security review passed; owner completion approval required.', operationKey('completion-approval-wait'))
    }),
    approveCompletion: () => activeTask && taskAction(() => platformApi.approveCompletion(activeTask.id, 'Owner approved the evidenced final result.', operationKey('completion'))),
    cancelTask: () => activeTask && taskAction(() => platformApi.cancelTask(activeTask.id, 'Owner cancelled the task.', operationKey('cancel'))),
    createObjectiveAndPlan: (objective: string) => activeTask && taskAction(async () => {
      const created = await platformApi.createObjective(activeTask.id, objective)
      await platformApi.createOrchestrationPlan(activeTask.id, created.objective_id, objective, [
        { id: 'implementation', title: 'Implement scoped work', description: 'Produce the approved artifact in a bounded sandbox.', depends_on: [], specialist_id: 'tech-development', acceptance_criteria: 'Approved behavior exists and compatibility is preserved.', evidence_requirements: 'Diff, commands, tests, and artifact references.', rollback_requirements: 'Revert the scoped patch or disable the additive capability.' },
        { id: 'security-review', title: 'Independent security review', description: 'Review authorization, isolation, data, and abuse boundaries.', depends_on: ['implementation'], specialist_id: 'cybersecurity', acceptance_criteria: 'No unresolved high-risk findings.', evidence_requirements: 'Review findings and decision.', rollback_requirements: 'Block delivery and return findings for repair.' },
      ])
    }),
    approveOrchestrationPlan: () => activeTask && taskAction(() => platformApi.approveOrchestrationPlan(activeTask.id)),
    assignPlanSpecialists: () => activeTask && taskAction(async () => {
      const currentVersion = Math.max(0, ...(orchestration?.task_plans.map(item => item.plan_version) || []))
      for (const step of orchestration?.plan_steps.filter(item => item.plan_version === currentVersion) || []) await platformApi.createAssignment(activeTask.id, step.id, step.accountable_specialist_id)
    }),
    createCustomSpecialist: (input: Record<string, unknown>) => taskAction(async () => { await platformApi.createCustomSpecialist(input); setSpecialists((await platformApi.specialists()).specialists) }),
    askCopilot: platformApi.copilot,
    logout: async () => { await platformApi.logout(); setTaskDetails(null); setTasks([]); await refresh() },
  }
}

export type PlatformState = ReturnType<typeof usePlatformState>
