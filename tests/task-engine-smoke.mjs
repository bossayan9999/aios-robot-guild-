const base = (process.env.AIOS_BASE_URL || 'http://127.0.0.1:8790').replace(/\/$/, '')
let cookie = ''

async function call(path, { method = 'GET', body, workspace = 'phase3-workspace-a', authenticated = true, expected = [200] } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
      ...(authenticated ? { 'X-Workspace-ID': workspace } : {}),
      'X-Correlation-ID': `phase3-${method.toLowerCase()}-${path.replaceAll('/', '-')}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => ({}))
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: expected ${expected.join('/')} but received ${response.status}: ${JSON.stringify(payload)}`)
  return { response, payload }
}

const auth = await call('/api/auth/status', { authenticated: false })
const credentials = { email: 'phase3-verification@example.test', password: 'phase3-local-verification-password' }
const session = await call(auth.payload.setup_required ? '/api/auth/setup' : '/api/auth/login', { method: 'POST', body: credentials, authenticated: false })
cookie = (session.response.headers.get('set-cookie') || '').split(';')[0]
if (!cookie) throw new Error('Authentication cookie was not issued')

await call('/api/tasks', { authenticated: false, expected: [401] })
const created = await call('/api/tasks', { method: 'POST', body: { title: 'Phase 3 verification task', description: 'Exercise the server-authoritative task engine.' }, expected: [201] })
const taskId = created.payload.task.id
await call(`/api/tasks/${taskId}`, { workspace: 'phase3-workspace-b', expected: [404] })
await call(`/api/tasks/${taskId}/plan`, { method: 'POST', body: { content: '1. Implement\n2. Test\n3. Review\n4. Validate', material_change: true, steps: [{ id: 'implement', title: 'Implement' }, { id: 'test', title: 'Test', depends_on: ['implement'] }] } })
await call(`/api/tasks/${taskId}/transition`, { method: 'POST', body: { to_state: 'RUNNING', reason: 'Invalid skip attempt', idempotency_key: 'invalid-running-transition' }, expected: [409] })

async function transition(to_state, key) {
  return call(`/api/tasks/${taskId}/transition`, { method: 'POST', body: { to_state, reason: `Advance to ${to_state}`, idempotency_key: key } })
}

await transition('WAITING_FOR_APPROVAL', 'to-waiting-approval')
await call(`/api/tasks/${taskId}/assignments`, { method: 'POST', body: { specialist_id: 'tech-development' }, expected: [201] })
await transition('ASSIGNED', 'to-assigned')
await transition('SANDBOX_PROVISIONING', 'to-sandbox')
await transition('RUNNING', 'to-running')
const repeated = await transition('RUNNING', 'to-running')
if (!repeated.payload.idempotent) throw new Error('Repeated transition was not idempotent')
await transition('TESTING', 'to-testing')
await transition('REVIEWING', 'to-reviewing')
await call(`/api/tasks/${taskId}/specialist-reviews`, { method: 'POST', body: { specialist_id: 'tech-development', decision: 'passed', findings: 'Implementation and tests reviewed.' }, expected: [201] })
await transition('VALIDATING', 'to-validating')
const evidence = await call(`/api/tasks/${taskId}/evidence`, { method: 'POST', body: { evidence_type: 'validation_report', title: 'Phase 3 API evidence', content: 'Authenticated local Wrangler verification passed.' }, expected: [201] })
await call(`/api/tasks/${taskId}/transition`, { method: 'POST', body: { to_state: 'COMPLETED', reason: 'Frontend direct completion attempt', idempotency_key: 'direct-completion' }, expected: [403] })
await transition('SECURITY_REVIEW', 'to-security-review')
await call(`/api/tasks/${taskId}/security-reviews`, { method: 'POST', body: { decision: 'passed', findings: 'Authorization, isolation, evidence and completion controls reviewed.' }, expected: [201] })
await transition('WAITING_FOR_COMPLETION_APPROVAL', 'to-completion-approval')
const approval = { decision: 'approved', reason: 'Owner accepts the verified result.', idempotency_key: 'final-completion-approval' }
await call(`/api/tasks/${taskId}/completion-approvals`, { method: 'POST', body: approval, expected: [409] })

for (const gate_type of ['implementation', 'tests', 'validation', 'evidence_capture']) {
  await call(`/api/tasks/${taskId}/gates`, { method: 'POST', body: { gate_type, status: 'passed', evidence_id: evidence.payload.id, reason: `${gate_type} evidence verified` } })
}
const completed = await call(`/api/tasks/${taskId}/completion-approvals`, { method: 'POST', body: approval })
if (completed.payload.task.state !== 'COMPLETED') throw new Error('Task did not reach COMPLETED after every gate passed')
const repeatedCompletion = await call(`/api/tasks/${taskId}/completion-approvals`, { method: 'POST', body: approval })
if (!repeatedCompletion.payload.idempotent) throw new Error('Completion transition was not idempotent')

const history = await call(`/api/tasks/${taskId}/events`)
if (!history.payload.events.every(event => event.workspace_id === 'phase3-workspace-a' && event.correlation_id && Number.isInteger(event.plan_version))) throw new Error('Event history is missing scope or correlation evidence')

const cancelledTask = await call('/api/tasks', { method: 'POST', body: { title: 'Cancellation verification', description: 'Verify cancellation and idempotency.' }, expected: [201] })
const cancelPath = `/api/tasks/${cancelledTask.payload.task.id}/cancel`
const cancelBody = { reason: 'Owner cancelled verification task.', idempotency_key: 'cancel-verification-task' }
await call(cancelPath, { method: 'POST', body: cancelBody })
const repeatedCancel = await call(cancelPath, { method: 'POST', body: cancelBody })
if (!repeatedCancel.payload.idempotent) throw new Error('Cancellation was not idempotent')

console.log(`PASS authenticated task lifecycle ${taskId}`)
console.log('PASS invalid transition, missing gates, evidence, completion, cancellation, idempotency, authorization and workspace isolation')
