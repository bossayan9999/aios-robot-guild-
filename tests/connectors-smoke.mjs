const base = (process.env.AIOS_BASE_URL || 'http://127.0.0.1:8794').replace(/\/$/, '')
const suffix = crypto.randomUUID().slice(0, 8)
const workspace = `phase6-${suffix}-a`
let cookie = ''
async function call(path, { method = 'GET', body, scope = workspace, auth = true, expected = [200] } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth && cookie ? { Cookie: cookie } : {}), ...(auth ? { 'X-Workspace-ID': scope } : {}), 'X-Correlation-ID': `phase6-${method}-${path}` }, ...(body ? { body: JSON.stringify(body) } : {}) })
  const payload = await response.json().catch(() => ({}))
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: expected ${expected.join('/')} got ${response.status}: ${JSON.stringify(payload)}`)
  return { response, payload }
}
const authStatus = await call('/api/auth/status', { auth: false })
const credentials = { email: 'phase6-verification@example.test', password: 'phase6-local-verification-password' }
const login = await call(authStatus.payload.setup_required ? '/api/auth/setup' : '/api/auth/login', { method: 'POST', body: credentials, auth: false })
cookie = (login.response.headers.get('set-cookie') || '').split(';')[0]
await call('/api/connectors', { auth: false, expected: [401] })
const registry = await call('/api/connectors')
if (registry.payload.connectors.length !== 13 || registry.payload.connectors.some(item => item.state !== 'NOT_CONFIGURED')) throw new Error('Connector registry did not begin honestly unconfigured')
const skills = await call('/api/skills')
if (skills.payload.skills.length !== 4) throw new Error('Skill registry was not seeded')

await call('/api/connectors/github/configure', { method: 'POST', body: { credential_reference: 'plaintext-secret' }, expected: [422] })
await call('/api/connectors/github/configure', { method: 'POST', body: { credential_reference: 'env:GITHUB_CONNECTOR_TOKEN' } })
const otherWorkspace = await call('/api/connectors', { scope: `phase6-${suffix}-b` })
if (otherWorkspace.payload.connectors.find(item => item.connector_id === 'github').state !== 'NOT_CONFIGURED') throw new Error('Connector configuration crossed workspace scope')
for (let attempt = 0; attempt < 3; attempt++) await call('/api/connectors/github/verify', { method: 'POST', body: {}, expected: [424] })
await call('/api/connectors/github/verify', { method: 'POST', body: {}, expected: [503] })
const afterFailure = await call('/api/connectors')
if (afterFailure.payload.connectors.find(item => item.connector_id === 'github').state !== 'ERROR') throw new Error('Missing GitHub credentials did not produce ERROR')

const mcp = await call('/api/connectors/mcp/verify', { method: 'POST', body: {} })
if (mcp.payload.state !== 'CONNECTED' || !mcp.payload.provider_identity) throw new Error('MCP live metadata capability did not verify')
const task = await call('/api/tasks', { method: 'POST', body: { title: 'Phase 6 connector verification', description: 'Verify scoped read invocation.' }, expected: [201] })
const grant = await call('/api/connectors/mcp/grants', { method: 'POST', body: { task_id: task.payload.task.id, plan_version: 0, actions: ['metadata.read'], resources: ['self'], data_classes: ['operational_metadata'], evidence_refs: ['evidence://phase6/grant'] }, expected: [201] })
await call('/api/connectors/mcp/grants', { method: 'POST', body: { task_id: task.payload.task.id, plan_version: 0, actions: ['admin.write'], resources: ['self'], data_classes: ['operational_metadata'], evidence_refs: ['evidence://phase6/invalid'] }, expected: [403] })
const invocationBody = { grant_id: grant.payload.grant_id, action_id: 'metadata.read', target: 'self', parameters: {}, idempotency_key: 'phase6-mcp-metadata' }
const invoked = await call('/api/connectors/mcp/invoke', { method: 'POST', body: invocationBody })
if (!invoked.payload.summary.verified) throw new Error('MCP invocation did not return verified metadata')
const repeated = await call('/api/connectors/mcp/invoke', { method: 'POST', body: invocationBody })
if (!repeated.payload.idempotent) throw new Error('Connector invocation was not idempotent')
await call('/api/connectors/mcp/invoke', { method: 'POST', body: { ...invocationBody, parameters: { changed: true } }, expected: [409] })

const oauth = await call('/api/connectors/gmail/oauth-state', { method: 'POST', body: { redirect_uri: `${base}/api/connectors/gmail/oauth/callback` }, expected: [201] })
if (!oauth.payload.state || oauth.payload.expires_in_seconds !== 600) throw new Error('OAuth state was not issued')
await call('/api/connectors/mcp/revoke', { method: 'POST', body: { reason: 'Owner completed local verification.' } })
const events = await call('/api/connectors/events')
if (!events.payload.events.length || !events.payload.events.every(item => item.workspace_id === workspace && item.correlation_id)) throw new Error('Connector audit events are incomplete or unscoped')
console.log(`PASS Phase 6 connector lifecycle ${task.payload.task.id}`)
console.log('PASS registry, skills, secret references, verification failure, circuit breaker, isolation, MCP live check, grant, idempotent invocation, OAuth state, revocation and audit')
