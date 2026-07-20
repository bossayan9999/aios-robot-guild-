import { workspaceFromRequest } from './task-engine'
import { seedBuiltIns } from './orchestration'

interface Env { DB: D1Database }
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
const fail = (message: string, status = 400) => json({ error: message }, status)
const uid = () => crypto.randomUUID().replaceAll('-', '').slice(0, 16)
const body = async <T>(request: Request) => {
  if (!request.headers.get('content-type')?.includes('application/json')) throw fail('JSON request required', 415)
  return request.json<T>()
}
const text = (value: unknown, name: string, min = 1, max = 10000) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw fail(`${name} must contain ${min} to ${max} characters`, 422)
  return value.trim()
}
const strings = (value: unknown, name: string, max = 50) => {
  if (!Array.isArray(value) || value.length > max || value.some(item => typeof item !== 'string' || item.length > 120)) throw fail(`${name} must be a bounded string array`, 422)
  return [...new Set(value)] as string[]
}
const org = (actor: number) => `owner-${actor}`
const parseList = (value: unknown) => JSON.parse(String(value || '[]')) as string[]
const subset = (requested: string[], allowed: unknown, label: string) => {
  const denied = requested.filter(item => !parseList(allowed).includes(item))
  if (denied.length) throw fail(`${label} exceeds the specialist manifest: ${denied.join(', ')}`, 403)
}

async function manifest(env: Env, id: string, actor: number, workspace: string) {
  const row = await env.DB.prepare('SELECT * FROM specialist_manifests WHERE id=? AND organization_id=? AND workspace_id=? ORDER BY version DESC LIMIT 1').bind(id, org(actor), workspace).first<Record<string, unknown>>()
  if (!row) throw fail('Specialist not found in this workspace', 404)
  return row
}
async function activeManifest(env: Env, id: string, actor: number, workspace: string) {
  const row = await manifest(env, id, actor, workspace)
  if (!row.enabled || row.revoked_at || row.suspended_at || row.status !== 'ACTIVE') throw fail('Specialist version is disabled, suspended, or revoked', 403)
  return row
}
async function assignment(env: Env, id: string, taskId: string, workspace: string) {
  const row = await env.DB.prepare('SELECT * FROM specialist_assignments WHERE id=? AND task_id=? AND workspace_id=?').bind(id, taskId, workspace).first<Record<string, unknown>>()
  if (!row) throw fail('Assignment not found in this task and workspace', 404)
  return row
}

export async function handleSpecialistRuntimeApi(request: Request, env: Env, actor: number, correlation: string): Promise<Response | null> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/api/specialist-runtime')) return null
  const workspace = workspaceFromRequest(request, actor), organization = org(actor), method = request.method
  await seedBuiltIns(env, actor, workspace, correlation)

  if (url.pathname === '/api/specialist-runtime/registry' && method === 'GET') {
    const [manifests, evaluations, grants, suspensions] = await Promise.all([
      env.DB.prepare('SELECT * FROM specialist_manifests WHERE organization_id=? AND workspace_id=? ORDER BY name,version DESC').bind(organization, workspace).all(),
      env.DB.prepare('SELECT * FROM specialist_evaluations WHERE organization_id=? AND workspace_id=? ORDER BY created_at DESC').bind(organization, workspace).all(),
      env.DB.prepare('SELECT * FROM specialist_capability_grants WHERE organization_id=? AND workspace_id=? ORDER BY created_at DESC').bind(organization, workspace).all(),
      env.DB.prepare("SELECT * FROM specialist_suspensions WHERE organization_id=? AND workspace_id=? AND status='ACTIVE' ORDER BY created_at DESC").bind(organization, workspace).all(),
    ])
    return json({ manifests: manifests.results, evaluations: evaluations.results, grants: grants.results, suspensions: suspensions.results })
  }
  const specialistMatch = url.pathname.match(/^\/api\/specialist-runtime\/specialists\/([a-z0-9-]+)$/)
  if (specialistMatch && method === 'GET') {
    const item = await manifest(env, specialistMatch[1], actor, workspace)
    const [skills, evaluations, performance] = await Promise.all([
      env.DB.prepare('SELECT * FROM specialist_skills WHERE specialist_id=? AND specialist_version=? AND workspace_id=?').bind(item.id, item.version, workspace).all(),
      env.DB.prepare('SELECT * FROM specialist_evaluations WHERE specialist_id=? AND specialist_version=? AND workspace_id=? ORDER BY created_at DESC').bind(item.id, item.version, workspace).all(),
      env.DB.prepare('SELECT * FROM specialist_performance_events WHERE specialist_id=? AND specialist_version=? AND workspace_id=? ORDER BY created_at DESC LIMIT 100').bind(item.id, item.version, workspace).all(),
    ])
    return json({ manifest: item, skills: skills.results, evaluations: evaluations.results, performance: performance.results })
  }
  const evaluationMatch = url.pathname.match(/^\/api\/specialist-runtime\/specialists\/([a-z0-9-]+)\/evaluations$/)
  if (evaluationMatch && method === 'POST') {
    const input = await body<{ evaluator_specialist_id: string; suite_version: number; sandbox_runtime: string; score: number; passed: boolean; findings: string; evidence_refs: string[] }>(request)
    const item = await manifest(env, evaluationMatch[1], actor, workspace)
    if (input.evaluator_specialist_id === item.id) return fail('A specialist cannot evaluate itself', 403)
    await activeManifest(env, input.evaluator_specialist_id, actor, workspace)
    if (input.sandbox_runtime !== 'docker-sandbox') return fail('Specialist evaluations require the approved Docker sandbox', 422)
    if (!Number.isFinite(input.score) || input.score < 0 || input.score > 100) return fail('Evaluation score must be between 0 and 100', 422)
    const evidence = strings(input.evidence_refs, 'Evidence references')
    if (!evidence.length) return fail('Evaluation evidence is required', 422)
    const id = uid(), status = input.passed && input.score >= 80 ? 'PASSED' : 'FAILED'
    await env.DB.prepare('INSERT INTO specialist_evaluations(id,specialist_id,specialist_version,organization_id,workspace_id,suite_version,sandbox_runtime,evaluator_specialist_id,score,passed,findings,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, item.id, item.version, organization, workspace, Math.max(1, Math.floor(input.suite_version)), input.sandbox_runtime, input.evaluator_specialist_id, input.score, status === 'PASSED' ? 1 : 0, text(input.findings, 'Findings', 3), actor, status, JSON.stringify(evidence), correlation).run()
    if (String(item.id).startsWith('custom-') && status === 'PASSED') await env.DB.prepare("UPDATE specialist_manifests SET sandbox_evaluated=1,status='EVALUATED',evidence_refs=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND workspace_id=?").bind(JSON.stringify(evidence), item.id, item.version, workspace).run()
    return json({ evaluation_id: id, status }, 201)
  }
  if (url.pathname === '/api/specialist-runtime/grants' && method === 'POST') {
    const input = await body<{ specialist_id: string; task_id: string; plan_version: number; assignment_id: string; capabilities: string[]; connectors: string[]; runtimes: string[]; data_scope: string[]; ttl_minutes?: number; approved?: boolean; evidence_refs: string[] }>(request)
    const item = await activeManifest(env, input.specialist_id, actor, workspace), assigned = await assignment(env, input.assignment_id, input.task_id, workspace)
    if (assigned.specialist_id !== item.id || Number(assigned.specialist_version) !== Number(item.version) || Number(assigned.plan_version) !== input.plan_version) return fail('Grant does not match the approved specialist assignment and plan version', 403)
    const capabilities = strings(input.capabilities, 'Capabilities'), connectors = strings(input.connectors, 'Connectors'), runtimes = strings(input.runtimes, 'Runtimes'), dataScope = strings(input.data_scope, 'Data scope')
    subset(capabilities, item.allowed_tools, 'Capability grant'); subset(connectors, item.allowed_connectors, 'Connector grant'); subset(runtimes, item.allowed_runtimes, 'Runtime grant'); subset(dataScope, item.allowed_data_scope, 'Data scope')
    const privileged = String(item.risk_level) === 'high' || connectors.length > 0 || capabilities.some(value => value.includes('write'))
    if (privileged && !input.approved) return fail('Privileged capability grants require explicit owner approval', 403)
    const evidence = strings(input.evidence_refs, 'Evidence references'); if (!evidence.length) return fail('Grant approval evidence is required', 422)
    const grantId = uid(), ttl = Math.max(5, Math.min(Number(input.ttl_minutes || 60), 1440)), expires = new Date(Date.now() + ttl * 60000).toISOString()
    await env.DB.prepare("INSERT INTO specialist_capability_grants(id,specialist_id,specialist_version,assignment_id,organization_id,workspace_id,task_id,plan_version,capabilities_json,connectors_json,runtimes_json,data_scope_json,expires_at,approved_by,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'ACTIVE',?,?)")
      .bind(grantId, item.id, item.version, input.assignment_id, organization, workspace, input.task_id, input.plan_version, JSON.stringify(capabilities), JSON.stringify(connectors), JSON.stringify(runtimes), JSON.stringify(dataScope), expires, actor, actor, JSON.stringify(evidence), correlation).run()
    return json({ grant_id: grantId, status: 'ACTIVE', expires_at: expires }, 201)
  }
  const grantMatch = url.pathname.match(/^\/api\/specialist-runtime\/grants\/([a-f0-9]{16})\/revoke$/)
  if (grantMatch && method === 'POST') {
    const input = await body<{ reason: string; evidence_refs: string[] }>(request), evidence = strings(input.evidence_refs, 'Evidence references')
    const result = await env.DB.prepare("UPDATE specialist_capability_grants SET status='REVOKED',revoked_at=CURRENT_TIMESTAMP,revocation_reason=?,evidence_refs=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND workspace_id=? AND status='ACTIVE'").bind(text(input.reason, 'Reason', 3), JSON.stringify(evidence), grantMatch[1], organization, workspace).run()
    if (!result.meta.changes) return fail('Active grant not found', 404)
    await env.DB.prepare("UPDATE specialist_execution_contracts SET status='CANCELLED',cancelled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE grant_id=? AND workspace_id=? AND status='READY'").bind(grantMatch[1], workspace).run()
    return json({ ok: true, status: 'REVOKED' })
  }
  if (url.pathname === '/api/specialist-runtime/contracts' && method === 'POST') {
    const input = await body<{ grant_id: string; assignment_id: string; task_id: string; plan_version: number; input: unknown; acceptance_criteria: string; evidence_requirements: string; evidence_refs?: string[] }>(request)
    const grant = await env.DB.prepare("SELECT * FROM specialist_capability_grants WHERE id=? AND assignment_id=? AND task_id=? AND plan_version=? AND organization_id=? AND workspace_id=? AND status='ACTIVE' AND expires_at>CURRENT_TIMESTAMP").bind(input.grant_id, input.assignment_id, input.task_id, input.plan_version, organization, workspace).first<Record<string, unknown>>()
    if (!grant) return fail('A current scoped capability grant is required', 403)
    const item = await activeManifest(env, String(grant.specialist_id), actor, workspace), contractId = uid()
    await env.DB.prepare("INSERT INTO specialist_execution_contracts(id,assignment_id,grant_id,specialist_id,specialist_version,organization_id,workspace_id,task_id,plan_version,input_json,expected_output_schema,acceptance_criteria,evidence_requirements,budget_json,expires_at,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'READY',?,?)")
      .bind(contractId, input.assignment_id, input.grant_id, item.id, item.version, organization, workspace, input.task_id, input.plan_version, JSON.stringify(input.input ?? {}), item.output_schema, text(input.acceptance_criteria, 'Acceptance criteria', 3), text(input.evidence_requirements, 'Evidence requirements', 3), item.budget_limits, grant.expires_at, actor, JSON.stringify(strings(input.evidence_refs || [], 'Evidence references')), correlation).run()
    return json({ contract_id: contractId, status: 'READY', execution_started: false }, 201)
  }
  const lifecycleMatch = url.pathname.match(/^\/api\/specialist-runtime\/specialists\/([a-z0-9-]+)\/(suspend|revoke)$/)
  if (lifecycleMatch && method === 'POST') {
    const input = await body<{ reason: string; evidence_refs: string[] }>(request), item = await manifest(env, lifecycleMatch[1], actor, workspace), evidence = strings(input.evidence_refs, 'Evidence references')
    if (!evidence.length) return fail('Lifecycle evidence is required', 422)
    const recordId = uid(), reason = text(input.reason, 'Reason', 3)
    if (lifecycleMatch[2] === 'suspend') {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO specialist_suspensions(id,specialist_id,specialist_version,organization_id,workspace_id,reason,suspended_by,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,'ACTIVE',?,?)").bind(recordId, item.id, item.version, organization, workspace, reason, actor, actor, JSON.stringify(evidence), correlation),
        env.DB.prepare("UPDATE specialist_manifests SET enabled=0,status='SUSPENDED',suspended_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND workspace_id=?").bind(item.id, item.version, workspace),
      ])
    } else {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO specialist_revocations(id,specialist_id,specialist_version,organization_id,workspace_id,reason,revoked_by,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,'REVOKED',?,?)").bind(recordId, item.id, item.version, organization, workspace, reason, actor, actor, JSON.stringify(evidence), correlation),
        env.DB.prepare("UPDATE specialist_manifests SET enabled=0,status='REVOKED',revoked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=? AND workspace_id=?").bind(item.id, item.version, workspace),
      ])
    }
    await env.DB.prepare("UPDATE specialist_capability_grants SET status='REVOKED',revoked_at=CURRENT_TIMESTAMP,revocation_reason=?,updated_at=CURRENT_TIMESTAMP WHERE specialist_id=? AND specialist_version=? AND workspace_id=? AND status='ACTIVE'").bind(reason, item.id, item.version, workspace).run()
    await env.DB.prepare("UPDATE specialist_execution_contracts SET status='CANCELLED',cancelled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE specialist_id=? AND specialist_version=? AND workspace_id=? AND status='READY'").bind(item.id, item.version, workspace).run()
    return json({ id: recordId, status: lifecycleMatch[2] === 'suspend' ? 'SUSPENDED' : 'REVOKED' })
  }
  return fail('Specialist runtime route not found', 404)
}
