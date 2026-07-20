const base = (process.env.AIOS_BASE_URL || 'http://127.0.0.1:8791').replace(/\/$/, '')
let cookie = ''
const workspace = 'phase4-workspace-a'

async function call(path, { method = 'GET', body, scope = workspace, authenticated = true, expected = [200] } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(authenticated && cookie ? { Cookie: cookie } : {}), ...(authenticated ? { 'X-Workspace-ID': scope } : {}), 'X-Correlation-ID': `phase4-${method}-${path}` }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const payload = await response.json().catch(() => ({}))
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: expected ${expected.join('/')} received ${response.status}: ${JSON.stringify(payload)}`)
  return { response, payload }
}

const auth = await call('/api/auth/status', { authenticated: false })
const credentials = { email: 'phase4-verification@example.test', password: 'phase4-local-verification-password' }
const login = await call(auth.payload.setup_required ? '/api/auth/setup' : '/api/auth/login', { method: 'POST', body: credentials, authenticated: false })
cookie = (login.response.headers.get('set-cookie') || '').split(';')[0]
if (!cookie) throw new Error('Authentication cookie missing')

await call('/api/orchestration/specialists', { authenticated: false, expected: [401] })
const custom = await call('/api/orchestration/specialists/custom', { method: 'POST', body: { name: 'Evidence Analyst', role: 'Evidence Analyst', instructions: 'Review task evidence within the approved scope and escalate uncertainty.', input_schema: { type: 'object' }, output_schema: { type: 'object' }, requested_tools: [], requested_connectors: [], requested_runtimes: ['docker-sandbox'], risk_level: 'medium', test_cases: [{ name: 'scope rejection' }] }, expected: [201] })
if (custom.payload.enabled !== false) throw new Error('Custom specialist was not default-off')
await call(`/api/orchestration/specialists/${custom.payload.id}/lifecycle`, { method: 'POST', body: { action: 'owner_approved', evidence_refs: ['evidence://phase4/owner'] }, expected: [409] })

const created = await call('/api/tasks', { method: 'POST', body: { title: 'Phase 4 orchestration verification', description: 'Verify bounded specialist coordination.' }, expected: [201] })
const taskId = created.payload.task.id
await call(`/api/orchestration/tasks/${taskId}`, { scope: 'phase4-workspace-b', expected: [404] })
const objective = await call('/api/orchestration/objectives', { method: 'POST', body: { task_id: taskId, objective: 'Implement a bounded capability and complete independent security review.', constraints: ['No external writes'], unknowns: ['Runtime availability'], risk_level: 'high' }, expected: [201] })
const invalidPlan = { objective_id: objective.payload.objective_id, summary: 'Invalid dependency verification plan.', steps: [{ id: 'one', title: 'One', description: 'First step.', depends_on: ['missing'], specialist_id: 'tech-development', acceptance_criteria: 'Artifact exists.', evidence_requirements: 'Artifact evidence.', rollback_requirements: 'Remove artifact.' }] }
await call(`/api/orchestration/tasks/${taskId}/plan`, { method: 'POST', body: invalidPlan, expected: [422] })
const plan = await call(`/api/orchestration/tasks/${taskId}/plan`, { method: 'POST', body: { objective_id: objective.payload.objective_id, summary: 'Implement, hand off, and independently review the scoped capability.', risk_level: 'high', steps: [
  { id: 'build', title: 'Build capability', description: 'Implement within the bounded sandbox.', depends_on: [], specialist_id: 'tech-development', acceptance_criteria: 'Implementation meets scope.', evidence_requirements: 'Diff and test evidence.', rollback_requirements: 'Revert additive changes.' },
  { id: 'review', title: 'Security review', description: 'Independently review the result.', depends_on: ['build'], specialist_id: 'cybersecurity', acceptance_criteria: 'No unresolved high-risk finding.', evidence_requirements: 'Security findings.', rollback_requirements: 'Block delivery.' },
] }, expected: [201] })
if (plan.payload.plan_version !== 1 || plan.payload.status !== 'DRAFT') throw new Error('Initial plan was not a versioned draft')
await call(`/api/orchestration/tasks/${taskId}/assignments`, { method: 'POST', body: { step_id: 'invalid', specialist_id: 'tech-development' }, expected: [403] })
await call(`/api/orchestration/tasks/${taskId}/approve-plan`, { method: 'POST', body: {} })
const detail = await call(`/api/orchestration/tasks/${taskId}`)
const [buildStep, reviewStep] = detail.payload.plan_steps
const buildAssignment = await call(`/api/orchestration/tasks/${taskId}/assignments`, { method: 'POST', body: { step_id: buildStep.id, specialist_id: 'tech-development', tools: [], connectors: [], runtimes: ['docker-sandbox'], data_scope: ['task'], retry_limit: 1 }, expected: [201] })
await call(`/api/orchestration/tasks/${taskId}/assignments`, { method: 'POST', body: { step_id: reviewStep.id, specialist_id: 'tech-development', tools: [], connectors: [], runtimes: ['docker-sandbox'], data_scope: ['task'] }, expected: [403] })
const securityAssignment = await call(`/api/orchestration/tasks/${taskId}/assignments`, { method: 'POST', body: { step_id: reviewStep.id, specialist_id: 'cybersecurity', tools: [], connectors: [], runtimes: ['docker-sandbox'], data_scope: ['task'] }, expected: [201] })
await call(`/api/orchestration/tasks/${taskId}/handoffs`, { method: 'POST', body: { assignment_id: buildAssignment.payload.assignment_id, destination_specialist_id: 'cybersecurity', input_contract: 'Review the bounded implementation result.', output_contract: 'Return findings and a decision.', artifacts: ['artifact://phase4/build'], evidence_refs: ['evidence://phase4/build'], unresolved_questions: 'None recorded.', risk_notes: 'Sensitive output needs independent review.', approval_state: 'APPROVED' }, expected: [201] })
const result = await call(`/api/orchestration/tasks/${taskId}/results`, { method: 'POST', body: { assignment_id: buildAssignment.payload.assignment_id, output: { summary: 'Bounded implementation produced.' }, evidence_refs: ['evidence://phase4/build'] }, expected: [201] })
await call(`/api/orchestration/tasks/${taskId}/reviews`, { method: 'POST', body: { result_id: result.payload.result_id, reviewer_specialist_id: 'tech-development', decision: 'PASSED', findings: 'Self review attempt.' }, expected: [403] })
await call(`/api/orchestration/tasks/${taskId}/conflicts`, { method: 'POST', body: { assignment_ids: [buildAssignment.payload.assignment_id, securityAssignment.payload.assignment_id], description: 'Implementation and security interpretations conflict.', evidence_refs: ['evidence://phase4/conflict'] }, expected: [201] })
await call(`/api/orchestration/tasks/${taskId}/repairs`, { method: 'POST', body: { assignment_id: buildAssignment.payload.assignment_id, reason: 'Address the independent security interpretation.' } })
await call(`/api/orchestration/tasks/${taskId}/reviews`, { method: 'POST', body: { result_id: result.payload.result_id, reviewer_specialist_id: 'cybersecurity', decision: 'PASSED', findings: 'Independent review passed after bounded repair.', evidence_refs: ['evidence://phase4/review'] }, expected: [201] })
await call(`/api/orchestration/tasks/${taskId}/escalations`, { method: 'POST', body: { assignment_id: securityAssignment.payload.assignment_id, reason: 'Owner decision required for unresolved conflict.', requested_action: 'Resolve interpretation before completion.' }, expected: [201] })
const report = await call(`/api/orchestration/tasks/${taskId}/final-report`)
if (report.payload.eligible || !report.payload.reasons.some(reason => reason.includes('Phase 3 completion gates'))) throw new Error('Final report bypassed Phase 3 gates')
const parent = await call(`/api/tasks/${taskId}`)
if (parent.payload.task.state === 'COMPLETED') throw new Error('Orchestration marked the parent task complete')
const timeline = await call(`/api/orchestration/tasks/${taskId}/timeline`)
if (timeline.payload.events.length < 10 || !timeline.payload.events.every(item => item.workspace_id === workspace && item.correlation_id)) throw new Error('Orchestration timeline is incomplete or unscoped')

console.log(`PASS Phase 4 Copilot orchestration lifecycle ${taskId}`)
console.log('PASS draft plan, approval, two assignments, tracked handoff, self-review rejection, conflict, repair, independent review, escalation, isolation, and Phase 3 gate protection')
