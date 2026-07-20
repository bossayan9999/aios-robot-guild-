import { workspaceFromRequest, type TaskRecord } from './task-engine'

interface Env { DB: D1Database }
export const ASSIGNMENT_STATES = ['PROPOSED', 'WAITING_FOR_APPROVAL', 'ASSIGNED', 'RUNNING', 'WAITING_FOR_INPUT', 'REVIEWING', 'REPAIRING', 'PASSED', 'FAILED', 'BLOCKED', 'CANCELLED'] as const
type AssignmentState = typeof ASSIGNMENT_STATES[number]

export function dependenciesValid(steps: { id: string; depends_on?: string[] }[]) {
  const ids = new Set(steps.map(step => step.id))
  if (ids.size !== steps.length || steps.some(step => (step.depends_on || []).some(dependency => !ids.has(dependency) || dependency === step.id))) return false
  const visiting = new Set<string>(), visited = new Set<string>(), byId = new Map(steps.map(step => [step.id, step.depends_on || []]))
  const visit = (step: string): boolean => {
    if (visiting.has(step)) return false
    if (visited.has(step)) return true
    visiting.add(step)
    if (!byId.get(step)!.every(visit)) return false
    visiting.delete(step); visited.add(step); return true
  }
  return steps.every(step => visit(step.id))
}

interface BuiltInSpecialist { id: string; name: string; instructions: string; risk: 'low' | 'medium' | 'high'; skills: string[]; tools: string[]; connectors: string[]; runtimes: string[] }
export const BUILT_INS: BuiltInSpecialist[] = [
  { id: 'copilot-manager', name: 'Copilot Manager', instructions: 'Coordinate scoped plans, approvals, assignments, evidence, and escalation without executing or completing work.', risk: 'medium', skills: ['planning', 'risk-classification', 'orchestration'], tools: ['task-read', 'plan-write'], connectors: [], runtimes: ['cloud-worker'] },
  { id: 'tech-development', name: 'Tech Development', instructions: 'Implement and review software with tests, compatibility notes, rollback, and evidence.', risk: 'medium', skills: ['software-engineering', 'testing'], tools: ['repository-read', 'repository-write', 'build', 'test'], connectors: ['github'], runtimes: ['docker-sandbox'] },
  { id: 'business', name: 'Business', instructions: 'Analyze requirements, operations, value, and evidence-backed priorities without commitments.', risk: 'low', skills: ['requirements', 'business-analysis'], tools: ['document-read'], connectors: [], runtimes: ['cloud-worker'] },
  { id: 'finance-advisory', name: 'Finance Advisory', instructions: 'Provide sourced scenario analysis without transactions or regulated personalized advice.', risk: 'high', skills: ['financial-analysis'], tools: ['document-read', 'calculation'], connectors: [], runtimes: ['cloud-worker'] },
  { id: 'ccna-network-security', name: 'CCNA Network and Security', instructions: 'Design and validate networks in simulation; live targets require authorization and rollback.', risk: 'high', skills: ['network-design', 'network-validation'], tools: ['network-simulation'], connectors: [], runtimes: ['docker-sandbox'] },
  { id: 'cybersecurity', name: 'Cybersecurity', instructions: 'Perform defensive security review within explicit authorization and evidence handling rules.', risk: 'high', skills: ['threat-modeling', 'security-review'], tools: ['repository-read', 'security-scan'], connectors: [], runtimes: ['docker-sandbox'] },
  { id: 'devops', name: 'DevOps', instructions: 'Build delivery and reliability controls; production writes require environment approval.', risk: 'high', skills: ['ci-cd', 'reliability'], tools: ['repository-read', 'build'], connectors: ['github', 'cloudflare'], runtimes: ['docker-sandbox'] },
  { id: 'research-osint', name: 'Research and OSINT', instructions: 'Produce lawful, attributable research with provenance, contradictions, and confidence.', risk: 'medium', skills: ['research', 'source-evaluation'], tools: ['document-read'], connectors: [], runtimes: ['cloud-worker'] },
  { id: 'ui-ux', name: 'UI and UX', instructions: 'Design accessible, responsive, truthful product experiences and validate user states.', risk: 'low', skills: ['accessibility', 'interaction-design'], tools: ['repository-read'], connectors: [], runtimes: ['docker-sandbox'] },
  { id: 'custom-specialist-builder', name: 'Custom Specialist Builder', instructions: 'Define sandbox-evaluated, independently reviewed, owner-approved specialist manifests.', risk: 'high', skills: ['manifest-authoring', 'evaluation-design'], tools: ['manifest-write'], connectors: [], runtimes: ['docker-sandbox'] },
]
const SCHEMA = JSON.stringify({ type: 'object', additionalProperties: false })
const json = (payload: unknown, status = 200) => Response.json(payload, { status, headers: { 'Cache-Control': 'no-store' } })
const fail = (message: string, status = 400) => json({ error: message }, status)
const parse = async <T>(request: Request) => {
  if (!request.headers.get('content-type')?.includes('application/json')) throw fail('JSON request required', 415)
  return request.json<T>()
}
const uid = () => crypto.randomUUID().replaceAll('-', '').slice(0, 16)
const text = (value: unknown, label: string, min = 1, max = 10000) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw fail(`${label} must contain ${min} to ${max} characters`, 422)
  return value.trim()
}
const list = (value: unknown, label: string, max = 30) => {
  if (!Array.isArray(value) || value.length > max || value.some(item => typeof item !== 'string' || item.length > 100)) throw fail(`${label} must be a string array with at most ${max} items`, 422)
  return [...new Set(value)] as string[]
}
const organization = (userId: number) => `owner-${userId}`

export async function seedBuiltIns(env: Env, userId: number, workspace: string, correlation: string) {
  const org = organization(userId)
  await env.DB.batch(BUILT_INS.map(item => env.DB.prepare(`INSERT OR IGNORE INTO specialist_manifests
    (id,version,organization_id,workspace_id,name,role,instructions,input_schema,output_schema,allowed_tools,allowed_connectors,allowed_runtimes,allowed_data_scope,risk_level,budget_limits,approval_requirements,prohibited_actions,reviewer_requirements,enabled,sandbox_evaluated,security_reviewed,owner_approved,created_by,status,evidence_refs,correlation_id)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(item.id, 1, org, workspace, item.name, item.name, item.instructions, SCHEMA, SCHEMA, JSON.stringify(item.tools), JSON.stringify(item.connectors), JSON.stringify(item.runtimes), '["task"]', item.risk, '{"max_retries":2,"max_steps":20,"max_runtime_minutes":60}', '["owner_for_high_risk","independent_review"]', '["self_grant","scope_expansion","approval_bypass","parent_completion"]', '["independent_specialist","security_for_sensitive"]', 1, 1, 1, 1, userId, 'ACTIVE', '[]', correlation)))
  await env.DB.batch(BUILT_INS.flatMap(item => [
    env.DB.prepare('UPDATE specialist_manifests SET allowed_skills=?,evaluation_suite=?,integrity_digest=COALESCE(integrity_digest,?) WHERE id=? AND version=1 AND organization_id=? AND workspace_id=?').bind(JSON.stringify(item.skills), JSON.stringify([{ id: 'scope-control', expected: 'reject_scope_expansion' }, { id: 'evidence', expected: 'require_evidence' }]), `builtin-v1-${item.id}`, item.id, org, workspace),
    ...item.skills.map(skill => env.DB.prepare("INSERT OR IGNORE INTO specialist_skills(specialist_id,specialist_version,organization_id,workspace_id,skill_id,skill_version,instructions,status,actor_user_id,evidence_refs,correlation_id) VALUES(?,1,?,?,?,1,?,'ACTIVE',?,'[]',?)").bind(item.id, org, workspace, skill, `Apply ${skill} only within the assignment contract.`, userId, correlation)),
  ]))
}

async function task(env: Env, taskId: string, userId: number, workspace: string) {
  const row = await env.DB.prepare('SELECT * FROM tasks WHERE id=? AND user_id=? AND workspace_id=?').bind(taskId, userId, workspace).first<TaskRecord>()
  if (!row) throw fail('Task not found in this workspace', 404)
  return row
}
async function currentPlan(env: Env, taskId: string, workspace: string) {
  return env.DB.prepare('SELECT * FROM task_plans WHERE task_id=? AND workspace_id=? ORDER BY plan_version DESC LIMIT 1').bind(taskId, workspace).first<Record<string, unknown>>()
}
async function event(env: Env, scope: { org: string; workspace: string; taskId: string; version: number; actor: number; correlation: string }, kind: string, targetType: string, targetId: string, status: string, detail: string, evidence: string[] = []) {
  await env.DB.prepare('INSERT INTO orchestration_events(organization_id,workspace_id,task_id,plan_version,actor_user_id,event_type,target_type,target_id,status,detail,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(scope.org, scope.workspace, scope.taskId, scope.version, scope.actor, kind, targetType, targetId, status, detail, JSON.stringify(evidence), scope.correlation).run()
}
async function details(env: Env, taskId: string, workspace: string) {
  const tables = ['copilot_sessions', 'copilot_objectives', 'task_plans', 'plan_steps', 'specialist_assignments', 'specialist_handoffs', 'specialist_results', 'review_findings', 'conflict_records', 'escalation_requests', 'orchestration_events']
  const values = await Promise.all(tables.map(name => env.DB.prepare(`SELECT * FROM ${name} WHERE task_id=? AND workspace_id=? ORDER BY created_at`).bind(taskId, workspace).all()))
  return Object.fromEntries(tables.map((name, index) => [name, values[index].results]))
}
function ensureSubset(requested: string[], allowedJson: unknown, label: string) {
  const allowed = JSON.parse(String(allowedJson || '[]')) as string[]
  const denied = requested.filter(item => !allowed.includes(item))
  if (denied.length) throw fail(`${label} exceeds specialist manifest: ${denied.join(', ')}`, 403)
}

export async function handleOrchestrationApi(request: Request, env: Env, userId: number, correlation: string): Promise<Response | null> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/api/orchestration')) return null
  const workspace = workspaceFromRequest(request, userId), org = organization(userId), method = request.method
  await seedBuiltIns(env, userId, workspace, correlation)

  if (url.pathname === '/api/orchestration/specialists' && method === 'GET') {
    const rows = await env.DB.prepare('SELECT * FROM specialist_manifests WHERE organization_id=? AND workspace_id=? AND revoked_at IS NULL ORDER BY name,version DESC').bind(org, workspace).all()
    return json({ specialists: rows.results })
  }
  const specialistMatch = url.pathname.match(/^\/api\/orchestration\/specialists\/([a-z0-9-]+)$/)
  if (specialistMatch && method === 'GET') {
    const row = await env.DB.prepare('SELECT * FROM specialist_manifests WHERE id=? AND organization_id=? AND workspace_id=? AND revoked_at IS NULL ORDER BY version DESC LIMIT 1').bind(specialistMatch[1], org, workspace).first()
    return row ? json({ specialist: row }) : fail('Specialist not found', 404)
  }
  if (url.pathname === '/api/orchestration/specialists/custom' && method === 'POST') {
    const input = await parse<Record<string, unknown>>(request), id = `custom-${uid()}`
    const name = text(input.name, 'Name', 3, 80), role = text(input.role, 'Role', 3, 160), instructions = text(input.instructions, 'Instructions', 10, 10000)
    const requestedSkills = list(input.requested_skills || [], 'Requested skills'), requestedTools = list(input.requested_tools || [], 'Requested tools'), connectors = list(input.requested_connectors || [], 'Requested connectors'), runtimes = list(input.requested_runtimes || [], 'Requested runtimes')
    const testCases = Array.isArray(input.test_cases) ? input.test_cases.slice(0, 20) : []
    await env.DB.prepare(`INSERT INTO specialist_manifests(id,version,organization_id,workspace_id,name,role,instructions,input_schema,output_schema,allowed_tools,allowed_connectors,allowed_runtimes,allowed_data_scope,risk_level,budget_limits,approval_requirements,prohibited_actions,reviewer_requirements,test_cases,enabled,sandbox_evaluated,security_reviewed,owner_approved,created_by,status,evidence_refs,correlation_id)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, 1, org, workspace, name, role, instructions, JSON.stringify(input.input_schema || {}), JSON.stringify(input.output_schema || {}), JSON.stringify(requestedTools), JSON.stringify(connectors), JSON.stringify(runtimes), JSON.stringify(['task']), text(input.risk_level || 'high', 'Risk level', 3, 20), '{"max_retries":1}', '["sandbox_evaluation","security_review","owner_approval"]', '["self_grant","scope_expansion","approval_bypass","parent_completion"]', '["independent_security_reviewer"]', JSON.stringify(testCases), 0, 0, 0, 0, userId, 'DRAFT', '[]', correlation).run()
    await env.DB.prepare('UPDATE specialist_manifests SET allowed_skills=?,evaluation_suite=? WHERE id=? AND version=1 AND organization_id=? AND workspace_id=?').bind(JSON.stringify(requestedSkills), JSON.stringify(testCases), id, org, workspace).run()
    return json({ id, version: 1, enabled: false, status: 'DRAFT' }, 201)
  }
  const lifecycleMatch = url.pathname.match(/^\/api\/orchestration\/specialists\/(custom-[a-f0-9]{16})\/lifecycle$/)
  if (lifecycleMatch && method === 'POST') {
    const input = await parse<{ action: 'sandbox_passed' | 'security_passed' | 'owner_approved' | 'revoke'; evidence_refs: string[] }>(request)
    const manifest = await env.DB.prepare('SELECT * FROM specialist_manifests WHERE id=? AND organization_id=? AND workspace_id=? ORDER BY version DESC LIMIT 1').bind(lifecycleMatch[1], org, workspace).first<Record<string, unknown>>()
    if (!manifest) return fail('Custom specialist not found', 404)
    const evidence = list(input.evidence_refs || [], 'Evidence references')
    if (!evidence.length) return fail('Lifecycle decisions require evidence', 422)
    if (input.action === 'sandbox_passed') await env.DB.prepare("UPDATE specialist_manifests SET sandbox_evaluated=1,status='EVALUATED',evidence_refs=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND workspace_id=?").bind(JSON.stringify(evidence), manifest.id, manifest.version, workspace).run()
    else if (input.action === 'security_passed') {
      if (!manifest.sandbox_evaluated) return fail('Sandbox evaluation must pass before security review', 409)
      const independentEvaluation = await env.DB.prepare("SELECT id FROM specialist_evaluations WHERE specialist_id=? AND specialist_version=? AND workspace_id=? AND passed=1 AND evaluator_specialist_id<>specialist_id ORDER BY created_at DESC LIMIT 1").bind(manifest.id, manifest.version, workspace).first()
      if (!independentEvaluation) return fail('Independent specialist evaluation must pass before security review', 409)
      await env.DB.prepare("UPDATE specialist_manifests SET security_reviewed=1,status='SECURITY_REVIEWED',evidence_refs=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND workspace_id=?").bind(JSON.stringify(evidence), manifest.id, manifest.version, workspace).run()
    } else if (input.action === 'owner_approved') {
      if (!manifest.sandbox_evaluated || !manifest.security_reviewed) return fail('Sandbox evaluation and security review are required before owner approval', 409)
      await env.DB.prepare("UPDATE specialist_manifests SET owner_approved=1,enabled=1,status='ACTIVE',evidence_refs=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND workspace_id=?").bind(JSON.stringify(evidence), manifest.id, manifest.version, workspace).run()
    } else if (input.action === 'revoke') await env.DB.prepare("UPDATE specialist_manifests SET enabled=0,status='REVOKED',revoked_at=CURRENT_TIMESTAMP,evidence_refs=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND workspace_id=?").bind(JSON.stringify(evidence), manifest.id, manifest.version, workspace).run()
    else return fail('Unknown specialist lifecycle action', 422)
    return json({ ok: true, action: input.action })
  }

  if (url.pathname === '/api/orchestration/objectives' && method === 'POST') {
    const input = await parse<{ task_id: string; objective: string; constraints?: string[]; unknowns?: string[]; risk_level?: string }>(request)
    const parent = await task(env, input.task_id, userId, workspace), sessionId = uid(), objectiveId = uid()
    const risk = ['low', 'medium', 'high', 'critical'].includes(input.risk_level || '') ? input.risk_level! : 'medium'
    await env.DB.batch([
      env.DB.prepare("INSERT INTO copilot_sessions(id,organization_id,workspace_id,task_id,plan_version,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,? ,?,'ACTIVE','[]',?)").bind(sessionId, org, workspace, parent.id, parent.current_plan_version, userId, correlation),
      env.DB.prepare("INSERT INTO copilot_objectives(id,session_id,organization_id,workspace_id,task_id,plan_version,objective,constraints_json,unknowns_json,risk_level,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,'DRAFT','[]',?)").bind(objectiveId, sessionId, org, workspace, parent.id, parent.current_plan_version, text(input.objective, 'Objective', 10, 4000), JSON.stringify(list(input.constraints || [], 'Constraints')), JSON.stringify(list(input.unknowns || [], 'Unknowns')), risk, userId, correlation),
    ])
    await event(env, { org, workspace, taskId: parent.id, version: parent.current_plan_version, actor: userId, correlation }, 'objective.created', 'objective', objectiveId, 'DRAFT', 'Copilot objective captured')
    return json({ session_id: sessionId, objective_id: objectiveId, status: 'DRAFT' }, 201)
  }

  const taskMatch = url.pathname.match(/^\/api\/orchestration\/tasks\/([a-f0-9]{16})(?:\/(plan|approve-plan|assignments|results|handoffs|reviews|conflicts|repairs|escalations|timeline|final-report))?$/)
  if (!taskMatch) return fail('Orchestration route not found', 404)
  const parent = await task(env, taskMatch[1], userId, workspace), action = taskMatch[2]
  if (!action && method === 'GET') return json({ task: parent, ...(await details(env, parent.id, workspace)) })
  if (action === 'timeline' && method === 'GET') return json({ events: (await env.DB.prepare('SELECT * FROM orchestration_events WHERE task_id=? AND workspace_id=? ORDER BY id').bind(parent.id, workspace).all()).results })
  if (action === 'plan' && method === 'GET') return json({ plan: await currentPlan(env, parent.id, workspace) })
  if (action === 'plan' && ['POST', 'PUT'].includes(method)) {
    const input = await parse<{ objective_id: string; summary: string; risk_level?: string; steps: { id?: string; title: string; description: string; depends_on?: string[]; specialist_id: string; acceptance_criteria: string; evidence_requirements: string; rollback_requirements: string; approval_required?: boolean; parallel_group?: string }[] }>(request)
    const objective = await env.DB.prepare('SELECT id FROM copilot_objectives WHERE id=? AND task_id=? AND workspace_id=?').bind(input.objective_id, parent.id, workspace).first()
    if (!objective) return fail('Objective not found in this task and workspace', 404)
    if (!Array.isArray(input.steps) || !input.steps.length || input.steps.length > 20) return fail('Plan requires 1 to 20 steps', 422)
    const version = Number((await currentPlan(env, parent.id, workspace))?.plan_version || 0) + 1, planId = uid()
    const keys = input.steps.map((step, index) => step.id || `step-${index + 1}`)
    if (!dependenciesValid(input.steps.map((step, index) => ({ id: keys[index], depends_on: step.depends_on })))) return fail('Step dependency is invalid or cyclic', 422)
    const specialists = await env.DB.prepare('SELECT id FROM specialist_manifests WHERE organization_id=? AND workspace_id=? AND enabled=1 AND revoked_at IS NULL').bind(org, workspace).all<{ id: string }>()
    const enabled = new Set(specialists.results.map(row => row.id))
    if (input.steps.some(step => !enabled.has(step.specialist_id))) return fail('Plan references a disabled or unauthorized specialist', 403)
    const risk = ['low', 'medium', 'high', 'critical'].includes(input.risk_level || '') ? input.risk_level! : 'medium'
    if (['high', 'critical'].includes(risk) && !input.steps.some(step => step.specialist_id === 'cybersecurity')) return fail('High-risk plans require Cybersecurity review routing', 422)
    const statements = [env.DB.prepare("INSERT INTO task_plans(id,objective_id,organization_id,workspace_id,task_id,plan_version,summary,risk_level,approval_required,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,1,?,'DRAFT','[]',?)").bind(planId, input.objective_id, org, workspace, parent.id, version, text(input.summary, 'Plan summary', 10, 10000), risk, userId, correlation)]
    input.steps.forEach((step, index) => statements.push(env.DB.prepare("INSERT INTO plan_steps(id,plan_id,organization_id,workspace_id,task_id,plan_version,position,title,description,dependencies_json,parallel_group,accountable_specialist_id,acceptance_criteria,evidence_requirements,rollback_requirements,approval_required,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'PROPOSED','[]',?)")
      .bind(`${planId}-${keys[index]}`, planId, org, workspace, parent.id, version, index, text(step.title, 'Step title', 2, 180), text(step.description, 'Step description', 3, 2000), JSON.stringify(step.depends_on || []), step.parallel_group || null, step.specialist_id, text(step.acceptance_criteria, 'Acceptance criteria', 3, 2000), text(step.evidence_requirements, 'Evidence requirements', 3, 2000), text(step.rollback_requirements, 'Rollback requirements', 3, 2000), step.approval_required ? 1 : 0, userId, correlation)))
    if (version > 1) statements.unshift(env.DB.prepare("UPDATE specialist_assignments SET status='CANCELLED',updated_at=CURRENT_TIMESTAMP WHERE task_id=? AND workspace_id=? AND status NOT IN ('PASSED','FAILED','BLOCKED','CANCELLED')").bind(parent.id, workspace))
    await env.DB.batch(statements)
    await event(env, { org, workspace, taskId: parent.id, version, actor: userId, correlation }, version > 1 ? 'plan.revised' : 'plan.created', 'plan', planId, 'DRAFT', `Plan version ${version} awaits validation and owner approval`)
    return json({ plan_id: planId, plan_version: version, status: 'DRAFT' }, 201)
  }
  if (action === 'approve-plan' && method === 'POST') {
    const plan = await currentPlan(env, parent.id, workspace)
    if (!plan || plan.status !== 'DRAFT') return fail('Current draft plan is not available for approval', 409)
    await env.DB.batch([
      env.DB.prepare("UPDATE task_plans SET status='APPROVED',approved_by=?,approved_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=? AND status='DRAFT'").bind(userId, plan.id, workspace),
      env.DB.prepare("UPDATE plan_steps SET status='ASSIGNED',updated_at=CURRENT_TIMESTAMP WHERE plan_id=? AND status='PROPOSED'").bind(plan.id),
    ])
    await event(env, { org, workspace, taskId: parent.id, version: Number(plan.plan_version), actor: userId, correlation }, 'plan.approved', 'plan', String(plan.id), 'APPROVED', 'Owner approved the scoped plan')
    return json({ ok: true, plan_version: plan.plan_version })
  }
  if (action === 'assignments' && method === 'POST') {
    const input = await parse<{ step_id: string; specialist_id: string; tools?: string[]; connectors?: string[]; runtimes?: string[]; data_scope?: string[]; retry_limit?: number }>(request)
    const plan = await currentPlan(env, parent.id, workspace)
    if (!plan || plan.status !== 'APPROVED') return fail('An approved current plan is required before assignment', 403)
    const step = await env.DB.prepare('SELECT * FROM plan_steps WHERE id=? AND plan_id=? AND task_id=? AND workspace_id=?').bind(input.step_id, plan.id, parent.id, workspace).first<Record<string, unknown>>()
    if (!step || step.accountable_specialist_id !== input.specialist_id) return fail('Assignment does not match the accountable specialist in the approved plan', 403)
    const manifest = await env.DB.prepare('SELECT * FROM specialist_manifests WHERE id=? AND organization_id=? AND workspace_id=? AND enabled=1 AND revoked_at IS NULL ORDER BY version DESC LIMIT 1').bind(input.specialist_id, org, workspace).first<Record<string, unknown>>()
    if (!manifest) return fail('Specialist is disabled, revoked, or outside this workspace', 403)
    const tools = list(input.tools || [], 'Tool grants'), connectors = list(input.connectors || [], 'Connector grants'), runtimes = list(input.runtimes || [], 'Runtime grants'), scope = list(input.data_scope || ['task'], 'Data scope')
    ensureSubset(tools, manifest.allowed_tools, 'Tool grant'); ensureSubset(connectors, manifest.allowed_connectors, 'Connector grant'); ensureSubset(runtimes, manifest.allowed_runtimes, 'Runtime grant'); ensureSubset(scope, manifest.allowed_data_scope, 'Data scope')
    const assignmentId = uid(), retryLimit = Math.max(0, Math.min(Number(input.retry_limit ?? 2), 3))
    await env.DB.prepare("INSERT INTO specialist_assignments(id,plan_step_id,specialist_id,specialist_version,organization_id,workspace_id,task_id,plan_version,capability_grants,connector_grants,runtime_grants,data_scope,retry_limit,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,? ,?,?,?,?,?,?,?,?,?,?, 'ASSIGNED','[]',?)")
      .bind(assignmentId, input.step_id, input.specialist_id, manifest.version, org, workspace, parent.id, plan.plan_version, JSON.stringify(tools), JSON.stringify(connectors), JSON.stringify(runtimes), JSON.stringify(scope), retryLimit, userId, correlation).run()
    await event(env, { org, workspace, taskId: parent.id, version: Number(plan.plan_version), actor: userId, correlation }, 'assignment.created', 'assignment', assignmentId, 'ASSIGNED', `${input.specialist_id} received bounded grants`)
    return json({ assignment_id: assignmentId, status: 'ASSIGNED' }, 201)
  }
  if (action === 'assignments' && method === 'PATCH') {
    const input = await parse<{ assignment_id: string; operation: 'pause' | 'cancel' | 'reassign'; specialist_id?: string }>(request)
    if (!['pause', 'cancel', 'reassign'].includes(input.operation)) return fail('Unknown assignment operation', 422)
    if (input.operation === 'reassign') return fail('Reassignment requires a revised and newly approved plan version', 409)
    const assignment = await env.DB.prepare('SELECT * FROM specialist_assignments WHERE id=? AND task_id=? AND workspace_id=?').bind(input.assignment_id, parent.id, workspace).first<Record<string, unknown>>()
    if (!assignment) return fail('Assignment not found', 404)
    const status: AssignmentState = input.operation === 'pause' ? 'WAITING_FOR_INPUT' : 'CANCELLED'
    await env.DB.prepare('UPDATE specialist_assignments SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=?').bind(status, input.assignment_id, workspace).run()
    await event(env, { org, workspace, taskId: parent.id, version: Number(assignment.plan_version), actor: userId, correlation }, `assignment.${input.operation}`, 'assignment', input.assignment_id, status, `Owner requested ${input.operation}`)
    return json({ ok: true, status })
  }
  if (action === 'results' && method === 'POST') {
    const input = await parse<{ assignment_id: string; output: unknown; evidence_refs: string[] }>(request)
    const assignment = await env.DB.prepare("SELECT * FROM specialist_assignments WHERE id=? AND task_id=? AND workspace_id=? AND status NOT IN ('CANCELLED','BLOCKED')").bind(input.assignment_id, parent.id, workspace).first<Record<string, unknown>>()
    if (!assignment) return fail('Active assignment not found', 404)
    const evidence = list(input.evidence_refs || [], 'Evidence references'), resultId = uid()
    if (!evidence.length) return fail('Specialist results require evidence references', 422)
    const conflictsWith = typeof input.output === 'object' && input.output && 'conflicts_with_assignment_ids' in input.output ? list((input.output as { conflicts_with_assignment_ids: unknown }).conflicts_with_assignment_ids, 'Conflicting assignment IDs') : []
    const conflictAssignmentIds = [...new Set([input.assignment_id, ...conflictsWith])]
    if (conflictsWith.length) {
      const found = await env.DB.prepare(`SELECT COUNT(*) AS count FROM specialist_assignments WHERE task_id=? AND workspace_id=? AND id IN (${conflictAssignmentIds.map(() => '?').join(',')})`).bind(parent.id, workspace, ...conflictAssignmentIds).first<{ count: number }>()
      if (Number(found?.count) !== conflictAssignmentIds.length) return fail('Detected conflict references assignments outside this task and workspace', 422)
    }
    await env.DB.batch([
      env.DB.prepare("INSERT INTO specialist_results(id,assignment_id,organization_id,workspace_id,task_id,plan_version,output_json,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?, 'SUBMITTED',?,?)").bind(resultId, input.assignment_id, org, workspace, parent.id, assignment.plan_version, JSON.stringify(input.output ?? {}), userId, JSON.stringify(evidence), correlation),
      env.DB.prepare("UPDATE specialist_assignments SET status='REVIEWING',evidence_refs=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify(evidence), input.assignment_id),
    ])
    await event(env, { org, workspace, taskId: parent.id, version: Number(assignment.plan_version), actor: userId, correlation }, 'result.submitted', 'result', resultId, 'SUBMITTED', 'Specialist result submitted for independent review', evidence)
    if (conflictsWith.length) {
      const conflictId = uid()
      await env.DB.prepare("INSERT INTO conflict_records(id,organization_id,workspace_id,task_id,plan_version,assignment_ids,description,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?, 'UNRESOLVED',?,?)").bind(conflictId, org, workspace, parent.id, assignment.plan_version, JSON.stringify(conflictAssignmentIds), 'Specialist output declared a conflicting result.', userId, JSON.stringify(evidence), correlation).run()
      await event(env, { org, workspace, taskId: parent.id, version: Number(assignment.plan_version), actor: userId, correlation }, 'conflict.detected', 'conflict', conflictId, 'UNRESOLVED', 'Conflicting specialist result detected', evidence)
    }
    return json({ result_id: resultId, status: 'SUBMITTED' }, 201)
  }
  if (action === 'handoffs' && method === 'POST') {
    const input = await parse<{ assignment_id: string; destination_specialist_id: string; input_contract: string; output_contract: string; artifacts: string[]; evidence_refs: string[]; unresolved_questions: string; risk_notes: string; approval_state: 'APPROVED' | 'WAITING_FOR_APPROVAL' }>(request)
    const assignment = await env.DB.prepare('SELECT * FROM specialist_assignments WHERE id=? AND task_id=? AND workspace_id=?').bind(input.assignment_id, parent.id, workspace).first<Record<string, unknown>>()
    if (!assignment) return fail('Source assignment not found', 404)
    const destination = await env.DB.prepare('SELECT id FROM specialist_manifests WHERE id=? AND workspace_id=? AND enabled=1 AND revoked_at IS NULL').bind(input.destination_specialist_id, workspace).first()
    if (!destination || input.destination_specialist_id === assignment.specialist_id) return fail('Handoff destination must be another enabled specialist', 422)
    const handoffId = uid(), evidence = list(input.evidence_refs || [], 'Evidence references')
    if (!evidence.length) return fail('Tracked handoffs require evidence', 422)
    if (!['APPROVED', 'WAITING_FOR_APPROVAL'].includes(input.approval_state)) return fail('Invalid handoff approval state', 422)
    await env.DB.prepare("INSERT INTO specialist_handoffs(id,assignment_id,source_specialist_id,destination_specialist_id,organization_id,workspace_id,task_id,plan_version,plan_step_id,input_contract,output_contract,artifacts_json,unresolved_questions,risk_notes,approval_state,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'RECORDED',?,?)")
      .bind(handoffId, input.assignment_id, assignment.specialist_id, input.destination_specialist_id, org, workspace, parent.id, assignment.plan_version, assignment.plan_step_id, text(input.input_contract, 'Input contract', 3), text(input.output_contract, 'Output contract', 3), JSON.stringify(list(input.artifacts || [], 'Artifacts')), text(input.unresolved_questions || 'None recorded', 'Unresolved questions', 3), text(input.risk_notes || 'No additional risk recorded', 'Risk notes', 3), input.approval_state, userId, JSON.stringify(evidence), correlation).run()
    await event(env, { org, workspace, taskId: parent.id, version: Number(assignment.plan_version), actor: userId, correlation }, 'handoff.recorded', 'handoff', handoffId, 'RECORDED', `${assignment.specialist_id} to ${input.destination_specialist_id}`, evidence)
    return json({ handoff_id: handoffId, status: 'RECORDED' }, 201)
  }
  if (action === 'reviews' && method === 'POST') {
    const input = await parse<{ result_id: string; reviewer_specialist_id: string; decision: 'PASSED' | 'FAILED' | 'REPAIR_REQUIRED'; findings: string; evidence_refs?: string[] }>(request)
    const result = await env.DB.prepare('SELECT r.*,a.specialist_id FROM specialist_results r JOIN specialist_assignments a ON a.id=r.assignment_id WHERE r.id=? AND r.task_id=? AND r.workspace_id=?').bind(input.result_id, parent.id, workspace).first<Record<string, unknown>>()
    if (!result) return fail('Result not found', 404)
    if (result.specialist_id === input.reviewer_specialist_id) return fail('Implementing specialist cannot review its own output', 403)
    const reviewer = await env.DB.prepare('SELECT id FROM specialist_manifests WHERE id=? AND workspace_id=? AND enabled=1 AND revoked_at IS NULL').bind(input.reviewer_specialist_id, workspace).first()
    if (!reviewer) return fail('Reviewer is disabled or unauthorized', 403)
    if (!['PASSED', 'FAILED', 'REPAIR_REQUIRED'].includes(input.decision)) return fail('Invalid review decision', 422)
    const reviewId = uid(), status = input.decision
    await env.DB.batch([
      env.DB.prepare('INSERT INTO review_findings(id,result_id,assignment_id,reviewer_specialist_id,organization_id,workspace_id,task_id,plan_version,decision,findings,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(reviewId, input.result_id, result.assignment_id, input.reviewer_specialist_id, org, workspace, parent.id, result.plan_version, input.decision, text(input.findings, 'Findings', 3), userId, status, JSON.stringify(list(input.evidence_refs || [], 'Evidence references')), correlation),
      env.DB.prepare('UPDATE specialist_assignments SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(input.decision === 'PASSED' ? 'PASSED' : input.decision === 'REPAIR_REQUIRED' ? 'REPAIRING' : 'FAILED', result.assignment_id),
    ])
    await event(env, { org, workspace, taskId: parent.id, version: Number(result.plan_version), actor: userId, correlation }, 'review.submitted', 'review', reviewId, status, input.findings)
    return json({ review_id: reviewId, status }, 201)
  }
  if (action === 'conflicts' && method === 'POST') {
    const input = await parse<{ assignment_ids: string[]; description: string; evidence_refs?: string[] }>(request), ids = list(input.assignment_ids, 'Assignment IDs')
    if (ids.length < 2) return fail('A conflict requires at least two assignments', 422)
    const found = await env.DB.prepare(`SELECT COUNT(*) AS count FROM specialist_assignments WHERE task_id=? AND workspace_id=? AND id IN (${ids.map(() => '?').join(',')})`).bind(parent.id, workspace, ...ids).first<{ count: number }>()
    if (Number(found?.count) !== ids.length) return fail('Conflict assignments must belong to this task and workspace', 422)
    const conflictId = uid(), plan = await currentPlan(env, parent.id, workspace)
    await env.DB.prepare("INSERT INTO conflict_records(id,organization_id,workspace_id,task_id,plan_version,assignment_ids,description,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?, 'UNRESOLVED',?,?)").bind(conflictId, org, workspace, parent.id, plan?.plan_version || parent.current_plan_version, JSON.stringify(ids), text(input.description, 'Conflict description', 3), userId, JSON.stringify(list(input.evidence_refs || [], 'Evidence references')), correlation).run()
    await event(env, { org, workspace, taskId: parent.id, version: Number(plan?.plan_version || 0), actor: userId, correlation }, 'conflict.reported', 'conflict', conflictId, 'UNRESOLVED', input.description)
    return json({ conflict_id: conflictId, status: 'UNRESOLVED' }, 201)
  }
  if (action === 'repairs' && method === 'POST') {
    const input = await parse<{ assignment_id: string; reason: string }>(request)
    const assignment = await env.DB.prepare('SELECT * FROM specialist_assignments WHERE id=? AND task_id=? AND workspace_id=?').bind(input.assignment_id, parent.id, workspace).first<Record<string, unknown>>()
    if (!assignment) return fail('Assignment not found', 404)
    const retry = Number(assignment.retry_count) + 1, limit = Number(assignment.retry_limit)
    const status: AssignmentState = retry > limit ? 'BLOCKED' : 'REPAIRING'
    await env.DB.prepare('UPDATE specialist_assignments SET retry_count=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(retry, status, input.assignment_id).run()
    await event(env, { org, workspace, taskId: parent.id, version: Number(assignment.plan_version), actor: userId, correlation }, 'repair.requested', 'assignment', input.assignment_id, status, `${text(input.reason, 'Repair reason', 3)}; attempt ${retry}/${limit}`)
    return json({ status, retry_count: retry, retry_limit: limit }, status === 'BLOCKED' ? 409 : 200)
  }
  if (action === 'escalations' && method === 'POST') {
    const input = await parse<{ assignment_id?: string; reason: string; requested_action: string }>(request), plan = await currentPlan(env, parent.id, workspace), escalationId = uid()
    await env.DB.prepare("INSERT INTO escalation_requests(id,organization_id,workspace_id,task_id,plan_version,assignment_id,reason,requested_action,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,'OPEN','[]',?)").bind(escalationId, org, workspace, parent.id, plan?.plan_version || parent.current_plan_version, input.assignment_id || null, text(input.reason, 'Escalation reason', 3), text(input.requested_action, 'Requested action', 3), userId, correlation).run()
    await event(env, { org, workspace, taskId: parent.id, version: Number(plan?.plan_version || 0), actor: userId, correlation }, 'owner.escalation', 'escalation', escalationId, 'OPEN', input.reason)
    return json({ escalation_id: escalationId, status: 'OPEN' }, 201)
  }
  if (action === 'final-report' && method === 'GET') {
    const [plan, assignments, conflicts, gates] = await Promise.all([
      currentPlan(env, parent.id, workspace),
      env.DB.prepare('SELECT * FROM specialist_assignments WHERE task_id=? AND workspace_id=?').bind(parent.id, workspace).all<Record<string, unknown>>(),
      env.DB.prepare("SELECT * FROM conflict_records WHERE task_id=? AND workspace_id=? AND status='UNRESOLVED'").bind(parent.id, workspace).all(),
      env.DB.prepare('SELECT gate_type,status,plan_version FROM task_gates WHERE task_id=? AND workspace_id=?').bind(parent.id, workspace).all<Record<string, unknown>>(),
    ])
    const reasons: string[] = []
    if (!plan || plan.status !== 'APPROVED') reasons.push('current orchestration plan is not approved')
    const currentAssignments = assignments.results.filter(item => Number(item.plan_version) === Number(plan?.plan_version))
    const currentConflicts = conflicts.results.filter(item => Number((item as { plan_version?: number }).plan_version) === Number(plan?.plan_version))
    if (!currentAssignments.length || currentAssignments.some(item => item.status !== 'PASSED')) reasons.push('all specialist assignments must pass independent review')
    if (currentConflicts.length) reasons.push('unresolved conflicts remain')
    const required = ['implementation', 'tests', 'validation', 'specialist_review', 'security_review', 'evidence_capture', 'approvals']
    const gateMap = new Map(gates.results.filter(item => Number(item.plan_version) === parent.current_plan_version).map(item => [String(item.gate_type), String(item.status)]))
    const missingGates = required.filter(gate => !['passed', 'not_applicable'].includes(gateMap.get(gate) || 'pending'))
    if (missingGates.length) reasons.push(`Phase 3 completion gates pending: ${missingGates.join(', ')}`)
    return json({ eligible: reasons.length === 0, parent_task_state: parent.state, plan_version: plan?.plan_version || 0, reasons, summary: reasons.length ? 'Final report is blocked.' : 'All orchestration and task completion evidence is eligible for owner review.' })
  }
  return fail('Orchestration operation not supported', 405)
}
