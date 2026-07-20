export const TASK_STATES = [
  'CREATED', 'PLANNING', 'WAITING_FOR_APPROVAL', 'ASSIGNED', 'SANDBOX_PROVISIONING', 'RUNNING', 'TESTING', 'REVIEWING', 'REPAIRING', 'VALIDATING', 'STAGING', 'SECURITY_REVIEW', 'WAITING_FOR_COMPLETION_APPROVAL', 'COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED', 'ROLLED_BACK',
] as const

export type TaskState = typeof TASK_STATES[number]
export type GateType = 'implementation' | 'tests' | 'validation' | 'specialist_review' | 'security_review' | 'evidence_capture' | 'approvals'
export const REQUIRED_GATES: GateType[] = ['implementation', 'tests', 'validation', 'specialist_review', 'security_review', 'evidence_capture', 'approvals']

export interface TaskRecord {
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

interface TaskEnv { DB: D1Database }

const TRANSITIONS: Record<TaskState, readonly TaskState[]> = {
  CREATED: ['PLANNING', 'CANCELLED'],
  PLANNING: ['WAITING_FOR_APPROVAL', 'BLOCKED', 'CANCELLED'],
  WAITING_FOR_APPROVAL: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['SANDBOX_PROVISIONING', 'BLOCKED', 'CANCELLED'],
  SANDBOX_PROVISIONING: ['RUNNING', 'BLOCKED', 'FAILED', 'CANCELLED'],
  RUNNING: ['TESTING', 'BLOCKED', 'FAILED', 'CANCELLED'],
  TESTING: ['REVIEWING', 'REPAIRING', 'FAILED', 'BLOCKED', 'CANCELLED'],
  REVIEWING: ['VALIDATING', 'REPAIRING', 'FAILED', 'BLOCKED', 'CANCELLED'],
  REPAIRING: ['RUNNING', 'BLOCKED', 'FAILED', 'CANCELLED'],
  VALIDATING: ['STAGING', 'SECURITY_REVIEW', 'REPAIRING', 'FAILED', 'BLOCKED', 'CANCELLED'],
  STAGING: ['SECURITY_REVIEW', 'REPAIRING', 'FAILED', 'BLOCKED', 'CANCELLED', 'ROLLED_BACK'],
  SECURITY_REVIEW: ['WAITING_FOR_COMPLETION_APPROVAL', 'REPAIRING', 'FAILED', 'BLOCKED', 'CANCELLED'],
  WAITING_FOR_COMPLETION_APPROVAL: ['REPAIRING', 'BLOCKED', 'CANCELLED'],
  COMPLETED: ['ROLLED_BACK'],
  FAILED: ['ROLLED_BACK'],
  BLOCKED: ['PLANNING', 'RUNNING', 'CANCELLED'],
  CANCELLED: [],
  ROLLED_BACK: [],
}

export function canTransition(from: TaskState, to: TaskState) {
  return TRANSITIONS[from].includes(to)
}

export function workspaceFromRequest(request: Request, userId: number) {
  const supplied = request.headers.get('X-Workspace-ID')?.trim()
  const workspace = supplied || `owner-${userId}`
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/.test(workspace)) throw taskError('Workspace ID must contain 3 to 64 safe characters', 422)
  return workspace
}

const response = (payload: unknown, status = 200) => Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } })
const taskError = (message: string, status = 400) => response({ error: message }, status)
const body = async <T>(request: Request) => {
  if (!request.headers.get('content-type')?.includes('application/json')) throw taskError('JSON request required', 415)
  return request.json<T>()
}
const id = () => crypto.randomUUID().replaceAll('-', '').slice(0, 16)
const cleanText = (value: unknown, name: string, min: number, max: number) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw taskError(`${name} must contain ${min} to ${max} characters`, 422)
  return value.trim()
}

async function scopedTask(env: TaskEnv, taskId: string, userId: number, workspaceId: string) {
  return env.DB.prepare('SELECT * FROM tasks WHERE id=? AND user_id=? AND workspace_id=?').bind(taskId, userId, workspaceId).first<TaskRecord>()
}

async function requireTask(env: TaskEnv, taskId: string, userId: number, workspaceId: string) {
  const task = await scopedTask(env, taskId, userId, workspaceId)
  if (!task) throw taskError('Task not found in this workspace', 404)
  return task
}

async function taskDetails(env: TaskEnv, task: TaskRecord) {
  const [plans, steps, dependencies, events, assignments, gates, evidence, specialistReviews, securityReviews, approvals] = await Promise.all([
    env.DB.prepare('SELECT * FROM task_plan_versions WHERE task_id=? ORDER BY version DESC').bind(task.id).all(),
    env.DB.prepare('SELECT * FROM task_steps WHERE task_id=? ORDER BY plan_version DESC,position').bind(task.id).all(),
    env.DB.prepare('SELECT * FROM task_dependencies WHERE task_id=? ORDER BY created_at').bind(task.id).all(),
    env.DB.prepare('SELECT * FROM task_state_events WHERE task_id=? ORDER BY id').bind(task.id).all(),
    env.DB.prepare('SELECT * FROM task_assignments WHERE task_id=? ORDER BY id').bind(task.id).all(),
    env.DB.prepare('SELECT * FROM task_gates WHERE task_id=? ORDER BY id').bind(task.id).all(),
    env.DB.prepare('SELECT * FROM task_evidence WHERE task_id=? ORDER BY created_at').bind(task.id).all(),
    env.DB.prepare('SELECT * FROM specialist_reviews WHERE task_id=? ORDER BY id').bind(task.id).all(),
    env.DB.prepare('SELECT * FROM security_reviews WHERE task_id=? ORDER BY id').bind(task.id).all(),
    env.DB.prepare('SELECT * FROM completion_approvals WHERE task_id=? ORDER BY id').bind(task.id).all(),
  ])
  return { task, plans: plans.results, steps: steps.results, dependencies: dependencies.results, events: events.results, assignments: assignments.results, gates: gates.results, evidence: evidence.results, specialist_reviews: specialistReviews.results, security_reviews: securityReviews.results, completion_approvals: approvals.results }
}

async function recordState(env: TaskEnv, task: TaskRecord, to: TaskState, actor: number, reason: string, correlationId: string, idempotencyKey: string, authorizedCompletion = false) {
  const existing = await env.DB.prepare('SELECT * FROM task_state_events WHERE task_id=? AND idempotency_key=?').bind(task.id, idempotencyKey).first<{ to_state: TaskState }>()
  if (existing) {
    if (existing.to_state !== to) throw taskError('Idempotency key was already used for another transition', 409)
    return { task: await scopedTask(env, task.id, task.user_id, task.workspace_id), idempotent: true }
  }
  if (!(authorizedCompletion && task.state === 'WAITING_FOR_COMPLETION_APPROVAL' && to === 'COMPLETED') && !canTransition(task.state, to)) throw taskError(`Invalid task transition: ${task.state} -> ${to}`, 409)
  await env.DB.batch([
    env.DB.prepare('UPDATE tasks SET state=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND workspace_id=? AND state=?').bind(to, task.id, task.user_id, task.workspace_id, task.state),
    env.DB.prepare('INSERT INTO task_state_events(task_id,workspace_id,from_state,to_state,actor_user_id,reason,plan_version,correlation_id,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?)').bind(task.id, task.workspace_id, task.state, to, actor, reason, task.current_plan_version, correlationId, idempotencyKey),
  ])
  return { task: await scopedTask(env, task.id, task.user_id, task.workspace_id), idempotent: false }
}

async function invalidateGates(env: TaskEnv, task: TaskRecord, actor: number, correlationId: string, reason: string) {
  await env.DB.batch([
    env.DB.prepare("UPDATE task_gates SET status='invalidated',reason=?,updated_at=CURRENT_TIMESTAMP WHERE task_id=? AND status IN ('passed','not_applicable')").bind(reason, task.id),
    env.DB.prepare("UPDATE task_assignments SET status='superseded',updated_at=CURRENT_TIMESTAMP WHERE task_id=? AND status='active'").bind(task.id),
    env.DB.prepare('INSERT INTO task_state_events(task_id,workspace_id,from_state,to_state,actor_user_id,reason,plan_version,correlation_id,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?)').bind(task.id, task.workspace_id, task.state, 'PLANNING', actor, reason, task.current_plan_version + 1, correlationId, `plan-${task.current_plan_version + 1}-${id()}`),
  ])
}

async function upsertGate(env: TaskEnv, task: TaskRecord, gate: GateType, status: string, applicable: boolean, evidenceId: string | null, reason: string, actor: number) {
  await env.DB.prepare(`INSERT INTO task_gates(task_id,workspace_id,gate_type,status,applicable,evidence_id,reason,plan_version,submitted_by)
    VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(task_id,gate_type) DO UPDATE SET status=excluded.status,applicable=excluded.applicable,evidence_id=excluded.evidence_id,reason=excluded.reason,plan_version=excluded.plan_version,submitted_by=excluded.submitted_by,updated_at=CURRENT_TIMESTAMP`)
    .bind(task.id, task.workspace_id, gate, status, applicable ? 1 : 0, evidenceId, reason, task.current_plan_version, actor).run()
}

export async function handleTaskApi(request: Request, env: TaskEnv, userId: number, correlationId: string): Promise<Response | null> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/api/tasks')) return null
  const workspaceId = workspaceFromRequest(request, userId)
  const method = request.method

  if (url.pathname === '/api/tasks' && method === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM tasks WHERE user_id=? AND workspace_id=? ORDER BY updated_at DESC LIMIT 100').bind(userId, workspaceId).all<TaskRecord>()
    return response({ workspace_id: workspaceId, tasks: rows.results })
  }
  if (url.pathname === '/api/tasks' && method === 'POST') {
    const input = await body<{ title: string; description?: string }>(request)
    const title = cleanText(input.title, 'Task title', 3, 180)
    const description = typeof input.description === 'string' ? input.description.trim().slice(0, 4000) : ''
    const taskId = id()
    await env.DB.batch([
      env.DB.prepare("INSERT INTO tasks(id,user_id,workspace_id,title,description,state,current_plan_version,correlation_id) VALUES(?,?,?,?,?,'CREATED',0,?)").bind(taskId, userId, workspaceId, title, description, correlationId),
      env.DB.prepare("INSERT INTO task_state_events(task_id,workspace_id,from_state,to_state,actor_user_id,reason,plan_version,correlation_id,idempotency_key) VALUES(?,?,NULL,'CREATED',?,'Task created',0,?,'create')").bind(taskId, workspaceId, userId, correlationId),
      ...REQUIRED_GATES.map(gate => env.DB.prepare("INSERT INTO task_gates(task_id,workspace_id,gate_type,status,applicable,reason,plan_version) VALUES(?,?,?,'pending',1,'Required by completion policy',0)").bind(taskId, workspaceId, gate)),
    ])
    return response(await taskDetails(env, (await scopedTask(env, taskId, userId, workspaceId))!), 201)
  }

  const match = url.pathname.match(/^\/api\/tasks\/([a-f0-9]{16})(?:\/(plan|transition|assignments|gates|evidence|specialist-reviews|security-reviews|completion-approvals|cancel|events))?$/)
  if (!match) return taskError('Task API route not found', 404)
  const task = await requireTask(env, match[1], userId, workspaceId)
  const action = match[2]
  if (!action && method === 'GET') return response(await taskDetails(env, task))
  if (action === 'events' && method === 'GET') {
    const events = await env.DB.prepare('SELECT * FROM task_state_events WHERE task_id=? AND workspace_id=? ORDER BY id').bind(task.id, workspaceId).all()
    return response({ task_id: task.id, workspace_id: workspaceId, events: events.results })
  }
  if (action === 'plan' && ['POST', 'PUT'].includes(method)) {
    if (['COMPLETED', 'CANCELLED', 'ROLLED_BACK'].includes(task.state)) return taskError(`Cannot revise a task in ${task.state}`, 409)
    const input = await body<{ content: string; material_change?: boolean; steps?: { id?: string; title: string; description?: string; depends_on?: string[] }[] }>(request)
    const content = cleanText(input.content, 'Plan', 3, 20000)
    const nextVersion = task.current_plan_version + 1
    const material = input.material_change !== false
    if (material) await invalidateGates(env, task, userId, correlationId, `Material plan change invalidated gates for version ${nextVersion}`)
    const steps = Array.isArray(input.steps) ? input.steps.slice(0, 100) : []
    const stepKeys = steps.map(step => step.id && /^[a-zA-Z0-9_-]{3,80}$/.test(step.id) ? step.id : id())
    const stepIds = stepKeys.map(stepKey => `${task.id}-${nextVersion}-${stepKey}`)
    const statements = [
      env.DB.prepare('INSERT INTO task_plan_versions(task_id,version,content,material_change,created_by) VALUES(?,?,?,?,?)').bind(task.id, nextVersion, content, material ? 1 : 0, userId),
      material
        ? env.DB.prepare("UPDATE tasks SET current_plan_version=?,state='PLANNING',updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND workspace_id=?").bind(nextVersion, task.id, userId, workspaceId)
        : env.DB.prepare('UPDATE tasks SET current_plan_version=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=? AND workspace_id=?').bind(nextVersion, task.id, userId, workspaceId),
      ...steps.map((step, index) => env.DB.prepare('INSERT INTO task_steps(id,task_id,plan_version,position,title,description) VALUES(?,?,?,?,?,?)').bind(stepIds[index], task.id, nextVersion, index, cleanText(step.title, 'Step title', 1, 180), typeof step.description === 'string' ? step.description.slice(0, 2000) : '')),
    ]
    for (let index = 0; index < steps.length; index++) for (const dependency of steps[index].depends_on || []) {
      const dependencyIndex = steps.findIndex((candidate, candidateIndex) => candidate.id === dependency || stepKeys[candidateIndex] === dependency)
      if (dependencyIndex < 0 || dependencyIndex === index) throw taskError('Step dependency is invalid', 422)
      statements.push(env.DB.prepare('INSERT INTO task_dependencies(task_id,step_id,depends_on_step_id) VALUES(?,?,?)').bind(task.id, stepIds[index], stepIds[dependencyIndex]))
    }
    await env.DB.batch(statements)
    return response(await taskDetails(env, (await scopedTask(env, task.id, userId, workspaceId))!))
  }
  if (action === 'transition' && method === 'POST') {
    const input = await body<{ to_state: TaskState; reason: string; idempotency_key: string }>(request)
    if (!TASK_STATES.includes(input.to_state) || input.to_state === 'COMPLETED') return taskError('COMPLETED is controlled by the completion approval endpoint', 403)
    const reason = cleanText(input.reason, 'Transition reason', 3, 1000)
    const key = cleanText(input.idempotency_key, 'Idempotency key', 6, 120)
    return response(await recordState(env, task, input.to_state, userId, reason, correlationId, key))
  }
  if (action === 'assignments' && method === 'POST') {
    const input = await body<{ specialist_id: string }>(request)
    const specialist = cleanText(input.specialist_id, 'Specialist ID', 3, 100)
    await env.DB.prepare('INSERT INTO task_assignments(task_id,workspace_id,specialist_id,assigned_by,plan_version) VALUES(?,?,?,?,?)').bind(task.id, workspaceId, specialist, userId, task.current_plan_version).run()
    return response({ ok: true }, 201)
  }
  if (action === 'evidence' && method === 'POST') {
    const input = await body<{ evidence_type: string; title: string; content: string; uri?: string; sha256?: string }>(request)
    const evidenceId = id()
    await env.DB.prepare('INSERT INTO task_evidence(id,task_id,workspace_id,evidence_type,title,content,uri,sha256,plan_version,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .bind(evidenceId, task.id, workspaceId, cleanText(input.evidence_type, 'Evidence type', 2, 80), cleanText(input.title, 'Evidence title', 2, 180), cleanText(input.content, 'Evidence content', 1, 20000), input.uri?.slice(0, 2000) || null, input.sha256?.slice(0, 128) || null, task.current_plan_version, userId).run()
    return response({ id: evidenceId }, 201)
  }
  if (action === 'gates' && method === 'POST') {
    const input = await body<{ gate_type: GateType; status: 'passed' | 'failed' | 'not_applicable'; evidence_id?: string; reason: string; applicable?: boolean }>(request)
    if (!REQUIRED_GATES.includes(input.gate_type)) return taskError('Unknown completion gate', 422)
    if (['specialist_review', 'security_review', 'approvals'].includes(input.gate_type)) return taskError('This gate is controlled by its dedicated review or approval endpoint', 403)
    const applicable = input.applicable !== false
    if (input.status === 'not_applicable' && applicable) return taskError('not_applicable requires applicable=false', 422)
    if (input.status === 'passed' && !input.evidence_id) return taskError('Passed gates require task evidence', 422)
    if (input.evidence_id) {
      const found = await env.DB.prepare('SELECT id FROM task_evidence WHERE id=? AND task_id=? AND workspace_id=? AND plan_version=?').bind(input.evidence_id, task.id, workspaceId, task.current_plan_version).first()
      if (!found) return taskError('Evidence does not belong to this task, workspace, and plan version', 422)
    }
    await upsertGate(env, task, input.gate_type, input.status, applicable, input.evidence_id || null, cleanText(input.reason, 'Gate reason', 3, 1000), userId)
    return response({ ok: true })
  }
  if (action === 'specialist-reviews' && method === 'POST') {
    const input = await body<{ specialist_id: string; decision: 'passed' | 'failed' | 'revision_requested'; findings: string }>(request)
    if (!['passed', 'failed', 'revision_requested'].includes(input.decision)) return taskError('Invalid specialist review decision', 422)
    await env.DB.prepare('INSERT INTO specialist_reviews(task_id,workspace_id,specialist_id,decision,findings,plan_version,reviewed_by) VALUES(?,?,?,?,?,?,?)').bind(task.id, workspaceId, cleanText(input.specialist_id, 'Specialist ID', 3, 100), input.decision, cleanText(input.findings, 'Review findings', 3, 10000), task.current_plan_version, userId).run()
    await upsertGate(env, task, 'specialist_review', input.decision === 'passed' ? 'passed' : 'failed', true, null, input.findings, userId)
    return response({ ok: true }, 201)
  }
  if (action === 'security-reviews' && method === 'POST') {
    const input = await body<{ decision: 'passed' | 'failed' | 'revision_requested'; findings: string }>(request)
    if (!['passed', 'failed', 'revision_requested'].includes(input.decision)) return taskError('Invalid security review decision', 422)
    await env.DB.prepare('INSERT INTO security_reviews(task_id,workspace_id,decision,findings,plan_version,reviewed_by) VALUES(?,?,?,?,?,?)').bind(task.id, workspaceId, input.decision, cleanText(input.findings, 'Security findings', 3, 10000), task.current_plan_version, userId).run()
    await upsertGate(env, task, 'security_review', input.decision === 'passed' ? 'passed' : 'failed', true, null, input.findings, userId)
    return response({ ok: true }, 201)
  }
  if (action === 'completion-approvals' && method === 'POST') {
    const input = await body<{ decision: 'approved' | 'rejected'; reason: string; idempotency_key: string }>(request)
    if (!['approved', 'rejected'].includes(input.decision)) return taskError('Decision must be approved or rejected', 422)
    const existingEvent = await env.DB.prepare('SELECT * FROM task_state_events WHERE task_id=? AND idempotency_key=?').bind(task.id, input.idempotency_key).first()
    if (existingEvent) return response({ task: await scopedTask(env, task.id, userId, workspaceId), idempotent: true })
    if (task.state !== 'WAITING_FOR_COMPLETION_APPROVAL') return taskError('Task is not awaiting completion approval', 409)
    const existingApproval = await env.DB.prepare('SELECT decision,plan_version FROM completion_approvals WHERE task_id=? AND idempotency_key=?').bind(task.id, input.idempotency_key).first<{ decision: string; plan_version: number }>()
    if (existingApproval && existingApproval.decision !== input.decision) return taskError('Idempotency key was already used for another approval decision', 409)
    if (existingApproval && existingApproval.plan_version !== task.current_plan_version) return taskError('Completion approval belongs to an invalidated plan version', 409)
    if (input.decision === 'rejected') {
      if (!existingApproval) await env.DB.prepare('INSERT INTO completion_approvals(task_id,workspace_id,decision,reason,plan_version,approved_by,idempotency_key) VALUES(?,?,?,?,?,?,?)').bind(task.id, workspaceId, input.decision, cleanText(input.reason, 'Approval reason', 3, 1000), task.current_plan_version, userId, input.idempotency_key).run()
      return response(await recordState(env, task, 'REPAIRING', userId, input.reason, correlationId, input.idempotency_key))
    }
    const gates = (await env.DB.prepare('SELECT gate_type,status,applicable FROM task_gates WHERE task_id=?').bind(task.id).all<{ gate_type: GateType; status: string; applicable: number }>()).results
    const missing = REQUIRED_GATES.filter(gate => gate !== 'approvals').filter(gate => {
      const record = gates.find(item => item.gate_type === gate)
      return !record || (record.applicable ? record.status !== 'passed' : record.status !== 'not_applicable')
    })
    if (missing.length) return taskError(`Completion blocked; missing gates: ${missing.join(', ')}`, 409)
    if (!existingApproval) await env.DB.prepare('INSERT INTO completion_approvals(task_id,workspace_id,decision,reason,plan_version,approved_by,idempotency_key) VALUES(?,?,?,?,?,?,?)').bind(task.id, workspaceId, input.decision, cleanText(input.reason, 'Approval reason', 3, 1000), task.current_plan_version, userId, input.idempotency_key).run()
    await upsertGate(env, task, 'approvals', 'passed', true, null, input.reason, userId)
    return response(await recordState(env, task, 'COMPLETED', userId, input.reason, correlationId, input.idempotency_key, true))
  }
  if (action === 'cancel' && method === 'POST') {
    const input = await body<{ reason: string; idempotency_key: string }>(request)
    return response(await recordState(env, task, 'CANCELLED', userId, cleanText(input.reason, 'Cancellation reason', 3, 1000), correlationId, cleanText(input.idempotency_key, 'Idempotency key', 6, 120)))
  }
  return taskError('Method not allowed for task endpoint', 405)
}
