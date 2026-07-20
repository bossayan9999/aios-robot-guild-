const base = (process.env.AIOS_BASE_URL || 'http://127.0.0.1:8793').replace(/\/$/, '')
const workspace = 'phase5-workspace-a'
let cookie = ''
async function call(path, { method = 'GET', body, scope = workspace, auth = true, expected = [200] } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth && cookie ? { Cookie: cookie } : {}), ...(auth ? { 'X-Workspace-ID': scope } : {}), 'X-Correlation-ID': `phase5-${method}-${path}` }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const payload = await response.json().catch(() => ({}))
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: expected ${expected.join('/')} got ${response.status}: ${JSON.stringify(payload)}`)
  return { response, payload }
}
const authStatus = await call('/api/auth/status', { auth: false })
const credentials = { email: 'phase5-verification@example.test', password: 'phase5-local-verification-password' }
const login = await call(authStatus.payload.setup_required ? '/api/auth/setup' : '/api/auth/login', { method: 'POST', body: credentials, auth: false })
cookie = (login.response.headers.get('set-cookie') || '').split(';')[0]
await call('/api/specialist-runtime/registry', { auth: false, expected: [401] })
const registry = await call('/api/specialist-runtime/registry')
if (registry.payload.manifests.length !== 10) throw new Error('Built-in specialist registry was not seeded')
await call('/api/specialist-runtime/registry', { scope: 'phase5-workspace-b' })

const task = await call('/api/tasks', { method: 'POST', body: { title: 'Phase 5 specialist runtime', description: 'Verify assignment-bound grants and contracts.' }, expected: [201] })
const taskId = task.payload.task.id
const objective = await call('/api/orchestration/objectives', { method: 'POST', body: { task_id: taskId, objective: 'Implement a scoped specialist runtime verification with independent security review.', risk_level: 'high' }, expected: [201] })
await call(`/api/orchestration/tasks/${taskId}/plan`, { method: 'POST', body: { objective_id: objective.payload.objective_id, summary: 'Bounded implementation and independent review.', risk_level: 'high', steps: [
  { id: 'build', title: 'Build', description: 'Implement bounded work.', specialist_id: 'tech-development', acceptance_criteria: 'Scoped output exists.', evidence_requirements: 'Test evidence.', rollback_requirements: 'Cancel contract.' },
  { id: 'review', title: 'Review', description: 'Review independently.', depends_on: ['build'], specialist_id: 'cybersecurity', acceptance_criteria: 'Security review passes.', evidence_requirements: 'Review evidence.', rollback_requirements: 'Block work.' },
] }, expected: [201] })
await call(`/api/orchestration/tasks/${taskId}/approve-plan`, { method: 'POST', body: {} })
const orchestration = await call(`/api/orchestration/tasks/${taskId}`)
const buildStep = orchestration.payload.plan_steps.find(step => step.accountable_specialist_id === 'tech-development')
const assigned = await call(`/api/orchestration/tasks/${taskId}/assignments`, { method: 'POST', body: { step_id: buildStep.id, specialist_id: 'tech-development', tools: ['repository-read'], connectors: [], runtimes: ['docker-sandbox'], data_scope: ['task'] }, expected: [201] })

await call('/api/specialist-runtime/grants', { method: 'POST', body: { specialist_id: 'tech-development', task_id: taskId, plan_version: 1, assignment_id: assigned.payload.assignment_id, capabilities: ['arbitrary-shell'], connectors: [], runtimes: ['docker-sandbox'], data_scope: ['task'], evidence_refs: ['evidence://phase5/grant'] }, expected: [403] })
const grant = await call('/api/specialist-runtime/grants', { method: 'POST', body: { specialist_id: 'tech-development', task_id: taskId, plan_version: 1, assignment_id: assigned.payload.assignment_id, capabilities: ['repository-read'], connectors: [], runtimes: ['docker-sandbox'], data_scope: ['task'], evidence_refs: ['evidence://phase5/grant'] }, expected: [201] })
await call('/api/specialist-runtime/contracts', { method: 'POST', body: { grant_id: grant.payload.grant_id, assignment_id: assigned.payload.assignment_id, task_id: taskId, plan_version: 1, input: { objective: 'verify' }, acceptance_criteria: 'Contract remains bounded.', evidence_requirements: 'Return result evidence.' }, expected: [201] })
await call('/api/specialist-runtime/specialists/tech-development/evaluations', { method: 'POST', body: { evaluator_specialist_id: 'tech-development', suite_version: 1, sandbox_runtime: 'docker-sandbox', score: 100, passed: true, findings: 'Self evaluation.', evidence_refs: ['evidence://phase5/evaluation'] }, expected: [403] })
await call('/api/specialist-runtime/specialists/tech-development/evaluations', { method: 'POST', body: { evaluator_specialist_id: 'cybersecurity', suite_version: 1, sandbox_runtime: 'docker-sandbox', score: 95, passed: true, findings: 'Independent sandbox evaluation passed.', evidence_refs: ['evidence://phase5/evaluation'] }, expected: [201] })
await call(`/api/specialist-runtime/grants/${grant.payload.grant_id}/revoke`, { method: 'POST', body: { reason: 'Verification revocation.', evidence_refs: ['evidence://phase5/revoke'] } })
await call('/api/specialist-runtime/contracts', { method: 'POST', body: { grant_id: grant.payload.grant_id, assignment_id: assigned.payload.assignment_id, task_id: taskId, plan_version: 1, input: {}, acceptance_criteria: 'Must fail.', evidence_requirements: 'None.' }, expected: [403] })
const details = await call('/api/specialist-runtime/specialists/tech-development')
if (!details.payload.evaluations.some(item => item.status === 'PASSED')) throw new Error('Independent evaluation was not durable')
console.log(`PASS Phase 5 specialist runtime lifecycle ${taskId}`)
console.log('PASS registry, isolation, bounded grant, contract, self-evaluation rejection, independent evaluation, revocation and cancellation')
