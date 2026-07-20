import { workspaceFromRequest } from './task-engine'

interface Env {
  DB: D1Database
  GITHUB_CONNECTOR_TOKEN?: string
  CLOUDFLARE_API_TOKEN?: string
  CLOUDFLARE_ACCOUNT_ID?: string
}
export const CONNECTION_STATES = ['NOT_CONFIGURED', 'CONFIGURING', 'CHECKING', 'CONNECTED', 'DISCONNECTED', 'ERROR', 'SUSPENDED', 'REVOKED'] as const
type ConnectionState = typeof CONNECTION_STATES[number]
interface ConnectorDefinition { id: string; name: string; provider: string; auth: string; baseUrl: string; scopes: string[]; destinations: string[]; actions: { id: string; classification: 'READ' | 'WRITE' | 'DESTRUCTIVE'; approval: boolean }[] }
const schema = JSON.stringify({ type: 'object', additionalProperties: false })
export const CONNECTORS: ConnectorDefinition[] = [
  { id: 'github', name: 'GitHub', provider: 'github.com', auth: 'server_secret_reference', baseUrl: 'https://api.github.com', scopes: ['metadata:read'], destinations: ['api.github.com'], actions: [{ id: 'repository.read', classification: 'READ', approval: false }] },
  { id: 'cloudflare', name: 'Cloudflare', provider: 'cloudflare.com', auth: 'server_secret_reference', baseUrl: 'https://api.cloudflare.com/client/v4', scopes: ['account:read'], destinations: ['api.cloudflare.com'], actions: [{ id: 'account.read', classification: 'READ', approval: false }] },
  { id: 'supabase', name: 'Supabase', provider: 'supabase.com', auth: 'server_secret_reference', baseUrl: '', scopes: [], destinations: [], actions: [] },
  { id: 'gmail', name: 'Gmail', provider: 'google.com', auth: 'oauth2', baseUrl: 'https://gmail.googleapis.com', scopes: [], destinations: ['gmail.googleapis.com'], actions: [] },
  { id: 'google-calendar', name: 'Google Calendar', provider: 'google.com', auth: 'oauth2', baseUrl: 'https://www.googleapis.com/calendar', scopes: [], destinations: ['www.googleapis.com'], actions: [] },
  { id: 'google-drive', name: 'Google Drive', provider: 'google.com', auth: 'oauth2', baseUrl: 'https://www.googleapis.com/drive', scopes: [], destinations: ['www.googleapis.com'], actions: [] },
  { id: 'slack', name: 'Slack', provider: 'slack.com', auth: 'oauth2', baseUrl: 'https://slack.com/api', scopes: [], destinations: ['slack.com'], actions: [] },
  { id: 'notion', name: 'Notion', provider: 'notion.so', auth: 'oauth2', baseUrl: 'https://api.notion.com', scopes: [], destinations: ['api.notion.com'], actions: [] },
  { id: 'model-providers', name: 'OpenAI and model providers', provider: 'model-provider', auth: 'server_secret_reference', baseUrl: '', scopes: [], destinations: [], actions: [] },
  { id: 'mcp', name: 'MCP', provider: 'cyberscool-mcp', auth: 'internal', baseUrl: '/mcp', scopes: ['metadata:read'], destinations: [], actions: [{ id: 'metadata.read', classification: 'READ', approval: false }] },
  { id: 'generic-rest', name: 'Generic REST', provider: 'custom', auth: 'server_secret_reference', baseUrl: '', scopes: [], destinations: [], actions: [] },
  { id: 'oauth', name: 'Custom OAuth', provider: 'custom', auth: 'oauth2', baseUrl: '', scopes: [], destinations: [], actions: [] },
  { id: 'api-key', name: 'API-key integration', provider: 'custom', auth: 'server_secret_reference', baseUrl: '', scopes: [], destinations: [], actions: [] },
]
const SKILLS = [
  ['connector-health', 'Connector Health Verification'], ['connector-read', 'Scoped Connector Read'], ['oauth-state', 'OAuth State Management'], ['credential-reference', 'Opaque Credential References'],
] as const
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
const fail = (message: string, status = 400) => json({ error: message }, status)
const uid = () => crypto.randomUUID().replaceAll('-', '').slice(0, 16)
const digest = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('')
const body = async <T>(request: Request) => {
  if (!request.headers.get('content-type')?.includes('application/json')) throw fail('JSON request required', 415)
  return request.json<T>()
}
const text = (value: unknown, label: string, min = 1, max = 2000) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw fail(`${label} must contain ${min} to ${max} characters`, 422)
  return value.trim()
}
const strings = (value: unknown, label: string, max = 50) => {
  if (!Array.isArray(value) || value.length > max || value.some(item => typeof item !== 'string' || item.length > 160)) throw fail(`${label} must be a bounded string array`, 422)
  return [...new Set(value)] as string[]
}
const organization = (actor: number) => `owner-${actor}`

async function seed(env: Env, actor: number, workspace: string, correlation: string) {
  const org = organization(actor)
  const statements = CONNECTORS.flatMap(item => [
    env.DB.prepare(`INSERT OR IGNORE INTO connector_manifests(id,version,organization_id,workspace_id,name,provider,auth_type,base_url,required_scopes,allowed_destinations,data_classes,rate_limit_per_minute,timeout_ms,max_retries,integrity_digest,enabled,actor_user_id,status,evidence_refs,correlation_id)
      VALUES(?,1,?,?,?,?,?,?,?,?,?,10,8000,2,?,1,?,'ACTIVE','[]',?)`).bind(item.id, org, workspace, item.name, item.provider, item.auth, item.baseUrl, JSON.stringify(item.scopes), JSON.stringify(item.destinations), '["operational_metadata"]', `builtin-v1-${item.id}`, actor, correlation),
    env.DB.prepare(`INSERT OR IGNORE INTO connector_instances(id,connector_id,connector_version,organization_id,workspace_id,state,actor_user_id,status,evidence_refs,correlation_id)
      VALUES(?,?,?,?,?,'NOT_CONFIGURED',?,'ACTIVE','[]',?)`).bind(`instance-${item.id}-${workspace}`, item.id, 1, org, workspace, actor, correlation),
    ...item.actions.map(action => env.DB.prepare(`INSERT OR IGNORE INTO connector_actions(connector_id,connector_version,organization_id,workspace_id,action_id,classification,input_schema,output_schema,approval_required,actor_user_id,status,evidence_refs,correlation_id)
      VALUES(?,1,?,?,?,?,?,?,?,?,'ACTIVE','[]',?)`).bind(item.id, org, workspace, action.id, action.classification, schema, schema, action.approval ? 1 : 0, actor, correlation)),
  ])
  statements.push(...SKILLS.map(([id, name]) => env.DB.prepare(`INSERT OR IGNORE INTO skill_registry(id,version,organization_id,workspace_id,name,description,input_schema,output_schema,risk_level,enabled,integrity_digest,actor_user_id,status,evidence_refs,correlation_id)
    VALUES(?,1,?,?,?,?,?,?,'medium',1,?,?,'ACTIVE','[]',?)`).bind(id, org, workspace, name, `${name} under least-privilege connector policy.`, schema, schema, `builtin-v1-${id}`, actor, correlation)))
  await env.DB.batch(statements)
}
async function instance(env: Env, connectorId: string, actor: number, workspace: string) {
  const row = await env.DB.prepare('SELECT i.*,m.name,m.provider,m.auth_type,m.base_url,m.required_scopes,m.allowed_destinations,m.rate_limit_per_minute,m.timeout_ms,m.max_retries FROM connector_instances i JOIN connector_manifests m ON m.id=i.connector_id AND m.version=i.connector_version AND m.workspace_id=i.workspace_id WHERE i.connector_id=? AND i.organization_id=? AND i.workspace_id=?').bind(connectorId, organization(actor), workspace).first<Record<string, unknown>>()
  if (!row) throw fail('Connector not found in this workspace', 404)
  return row
}
async function audit(env: Env, scope: { instanceId?: string; org: string; workspace: string; actor: number; correlation: string; taskId?: string; planVersion?: number }, event: string, target: string, outcome: string, status: string) {
  await env.DB.prepare('INSERT INTO connector_audit_events(connector_instance_id,organization_id,workspace_id,task_id,plan_version,event_type,target,outcome,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,? ,\'[]\',?)')
    .bind(scope.instanceId || null, scope.org, scope.workspace, scope.taskId || null, scope.planVersion || 0, event, target.slice(0, 500), outcome, scope.actor, status, scope.correlation).run()
}
async function rateLimit(env: Env, row: Record<string, unknown>, workspace: string) {
  const current = await env.DB.prepare("SELECT request_count,window_started_at FROM connector_rate_limits WHERE connector_instance_id=? AND workspace_id=? AND window_started_at>datetime('now','-1 minute')").bind(row.id, workspace).first<{ request_count: number; window_started_at: string }>()
  if (current && current.request_count >= Number(row.rate_limit_per_minute)) throw fail('Connector rate limit exceeded', 429)
  if (current) await env.DB.prepare('UPDATE connector_rate_limits SET request_count=request_count+1,updated_at=CURRENT_TIMESTAMP WHERE connector_instance_id=? AND workspace_id=?').bind(row.id, workspace).run()
  else await env.DB.prepare("INSERT INTO connector_rate_limits(connector_instance_id,workspace_id,window_started_at,request_count) VALUES(?,?,CURRENT_TIMESTAMP,1) ON CONFLICT(connector_instance_id,workspace_id) DO UPDATE SET window_started_at=CURRENT_TIMESTAMP,request_count=1,updated_at=CURRENT_TIMESTAMP").bind(row.id, workspace).run()
}
async function circuitAllowed(env: Env, row: Record<string, unknown>, workspace: string) {
  const circuit = await env.DB.prepare("SELECT state FROM connector_circuit_breakers WHERE connector_instance_id=? AND workspace_id=? AND state='OPEN' AND retry_after>CURRENT_TIMESTAMP").bind(row.id, workspace).first<{ state: string }>()
  if (circuit) throw fail('Connector circuit breaker is open', 503)
}
async function recordFailure(env: Env, row: Record<string, unknown>, workspace: string, detail: string) {
  await env.DB.prepare(`INSERT INTO connector_circuit_breakers(connector_instance_id,workspace_id,failure_count,state,last_failure)
    VALUES(?,?,1,'CLOSED',?) ON CONFLICT(connector_instance_id,workspace_id) DO UPDATE SET failure_count=failure_count+1,state=CASE WHEN failure_count+1>=3 THEN 'OPEN' ELSE 'CLOSED' END,opened_at=CASE WHEN failure_count+1>=3 THEN CURRENT_TIMESTAMP ELSE opened_at END,retry_after=CASE WHEN failure_count+1>=3 THEN datetime('now','+5 minutes') ELSE retry_after END,last_failure=excluded.last_failure,updated_at=CURRENT_TIMESTAMP`).bind(row.id, workspace, detail.slice(0, 500)).run()
}
async function recordSuccess(env: Env, row: Record<string, unknown>, workspace: string) {
  await env.DB.prepare("INSERT INTO connector_circuit_breakers(connector_instance_id,workspace_id,failure_count,state) VALUES(?,?,0,'CLOSED') ON CONFLICT(connector_instance_id,workspace_id) DO UPDATE SET failure_count=0,state='CLOSED',opened_at=NULL,retry_after=NULL,last_failure=NULL,updated_at=CURRENT_TIMESTAMP").bind(row.id, workspace).run()
}
function secret(env: Env, reference: unknown) {
  if (reference === 'env:GITHUB_CONNECTOR_TOKEN') return env.GITHUB_CONNECTOR_TOKEN
  if (reference === 'env:CLOUDFLARE_API_TOKEN') return env.CLOUDFLARE_API_TOKEN
  return undefined
}
async function fetchWithRetry(url: string, init: RequestInit, maxRetries: number, timeoutMs: number) {
  let lastError: unknown
  for (let attempt = 0; attempt <= Math.max(0, Math.min(maxRetries, 3)); attempt++) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
      if (response.status !== 429 && response.status < 500) return response
      lastError = new Error(`Provider returned transient status ${response.status}`)
    } catch (problem) { lastError = problem }
  }
  throw lastError instanceof Error ? lastError : new Error('Provider request exhausted its retry budget')
}
async function providerCheck(row: Record<string, unknown>, env: Env, request: Request) {
  if (row.connector_id === 'mcp') return { identity: new URL(request.url).origin, scopes: ['metadata:read'], detail: 'CyberScool MCP metadata capability is available.' }
  const token = secret(env, row.credential_reference)
  if (!token) throw new Error('Credential reference cannot be resolved by the server secret provider')
  if (row.connector_id === 'github') {
    const response = await fetchWithRetry('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'CyberScool/1.0' } }, Number(row.max_retries), Number(row.timeout_ms))
    if (!response.ok) throw new Error(`GitHub credential verification returned ${response.status}`)
    const data = await response.json<{ login?: string; id?: number }>()
    if (!data.login || !data.id) throw new Error('GitHub provider identity was not returned')
    return { identity: `github:${data.id}:${data.login}`, scopes: (response.headers.get('x-oauth-scopes') || 'metadata:read').split(',').map(value => value.trim()).filter(Boolean), detail: 'GitHub credentials and provider identity verified.' }
  }
  if (row.connector_id === 'cloudflare') {
    const response = await fetchWithRetry('https://api.cloudflare.com/client/v4/user/tokens/verify', { headers: { Authorization: `Bearer ${token}` } }, Number(row.max_retries), Number(row.timeout_ms))
    const data = await response.json<{ success?: boolean; result?: { id?: string; status?: string } }>()
    if (!response.ok || !data.success || data.result?.status !== 'active') throw new Error(`Cloudflare token verification returned ${response.status}`)
    if (!env.CLOUDFLARE_ACCOUNT_ID) throw new Error('Cloudflare account identity reference is not configured')
    const account = await fetchWithRetry(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}`, { headers: { Authorization: `Bearer ${token}` } }, Number(row.max_retries), Number(row.timeout_ms))
    const accountData = await account.json<{ success?: boolean; result?: { id?: string } }>()
    if (!account.ok || !accountData.success || accountData.result?.id !== env.CLOUDFLARE_ACCOUNT_ID) throw new Error(`Cloudflare account permission verification returned ${account.status}`)
    return { identity: `cloudflare:${env.CLOUDFLARE_ACCOUNT_ID}`, scopes: ['account:read'], detail: 'Cloudflare token, account identity, and read permission verified.' }
  }
  throw new Error('This connector has no verified provider adapter')
}

export async function handleConnectorApi(request: Request, env: Env, actor: number, correlation: string): Promise<Response | null> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/api/connectors') && !url.pathname.startsWith('/api/skills')) return null
  const workspace = workspaceFromRequest(request, actor), org = organization(actor), method = request.method
  await seed(env, actor, workspace, correlation)
  if (url.pathname === '/api/skills' && method === 'GET') return json({ skills: (await env.DB.prepare('SELECT * FROM skill_registry WHERE organization_id=? AND workspace_id=? ORDER BY name').bind(org, workspace).all()).results })
  if (url.pathname === '/api/connectors' && method === 'GET') {
    const rows = await env.DB.prepare('SELECT i.id,i.connector_id,i.connector_version,i.state,i.provider_identity,i.verified_scopes,i.last_verified_at,i.failure_reason,i.status,m.name,m.provider,m.auth_type,m.required_scopes FROM connector_instances i JOIN connector_manifests m ON m.id=i.connector_id AND m.version=i.connector_version AND m.workspace_id=i.workspace_id WHERE i.organization_id=? AND i.workspace_id=? ORDER BY m.name').bind(org, workspace).all()
    return json({ connectors: rows.results })
  }
  if (url.pathname === '/api/connectors/events' && method === 'GET') return json({ events: (await env.DB.prepare('SELECT * FROM connector_audit_events WHERE organization_id=? AND workspace_id=? ORDER BY id DESC LIMIT 200').bind(org, workspace).all()).results })
  const match = url.pathname.match(/^\/api\/connectors\/([a-z0-9-]+)(?:\/(configure|verify|revoke|grants|invoke|oauth-state))?$/)
  if (!match) return fail('Connector route not found', 404)
  const row = await instance(env, match[1], actor, workspace), action = match[2]
  const scope = { instanceId: String(row.id), org, workspace, actor, correlation }
  if (!action && method === 'GET') {
    const [actions, grants, health] = await Promise.all([
      env.DB.prepare('SELECT * FROM connector_actions WHERE connector_id=? AND connector_version=? AND organization_id=? AND workspace_id=?').bind(row.connector_id, row.connector_version, org, workspace).all(),
      env.DB.prepare('SELECT * FROM connector_grants WHERE connector_instance_id=? AND organization_id=? AND workspace_id=? ORDER BY created_at DESC').bind(row.id, org, workspace).all(),
      env.DB.prepare('SELECT * FROM connector_health_checks WHERE connector_instance_id=? AND organization_id=? AND workspace_id=? ORDER BY created_at DESC LIMIT 20').bind(row.id, org, workspace).all(),
    ])
    const { credential_reference: _credentialReference, ...safeConnector } = row
    return json({ connector: safeConnector, actions: actions.results, grants: grants.results, health_checks: health.results })
  }
  if (action === 'configure' && method === 'POST') {
    const input = await body<{ credential_reference?: string }>(request)
    if (row.auth_type === 'internal') return fail('Internal connectors do not accept credentials', 422)
    if (row.state === 'REVOKED') return fail('Revoked connectors require a new reviewed instance before configuration', 409)
    const reference = text(input.credential_reference, 'Credential reference', 8, 160)
    if (!/^(env:[A-Z0-9_]+|vault:[a-zA-Z0-9/_-]+)$/.test(reference)) return fail('Only opaque env: or vault: secret references are accepted', 422)
    const credentialId = uid()
    await env.DB.batch([
      env.DB.prepare("UPDATE connector_credential_references SET status='SUPERSEDED',updated_at=CURRENT_TIMESTAMP WHERE connector_instance_id=? AND workspace_id=? AND status='ACTIVE'").bind(row.id, workspace),
      env.DB.prepare("INSERT INTO connector_credential_references(id,connector_instance_id,organization_id,workspace_id,provider,secret_reference,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,'ACTIVE','[]',?)").bind(credentialId, row.id, org, workspace, row.provider, reference, actor, correlation),
      env.DB.prepare("UPDATE connector_instances SET credential_reference=?,state='CONFIGURING',provider_identity=NULL,verified_scopes='[]',last_verified_at=NULL,failure_reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND workspace_id=?").bind(reference, row.id, org, workspace),
      env.DB.prepare("INSERT INTO connector_circuit_breakers(connector_instance_id,workspace_id,failure_count,state) VALUES(?,?,0,'CLOSED') ON CONFLICT(connector_instance_id,workspace_id) DO UPDATE SET failure_count=0,state='CLOSED',opened_at=NULL,retry_after=NULL,last_failure=NULL,updated_at=CURRENT_TIMESTAMP").bind(row.id, workspace),
    ])
    await audit(env, scope, 'connector.configured', String(row.connector_id), 'Credential reference stored; verification required', 'CONFIGURING')
    return json({ state: 'CONFIGURING', credential_reference_id: credentialId })
  }
  if (action === 'verify' && method === 'POST') {
    await rateLimit(env, row, workspace); await circuitAllowed(env, row, workspace)
    await env.DB.prepare("UPDATE connector_instances SET state='CHECKING',updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=?").bind(row.id, workspace).run()
    const healthId = uid(), started = Date.now()
    try {
      const verified = await providerCheck(row, env, request)
      await env.DB.batch([
        env.DB.prepare("INSERT INTO connector_health_checks(id,connector_instance_id,organization_id,workspace_id,provider_identity,credentials_valid,permissions_valid,health_valid,latency_ms,detail,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,1,1,1,?,?,?,'CONNECTED','[]',?)").bind(healthId, row.id, org, workspace, verified.identity, Date.now() - started, verified.detail, actor, correlation),
        env.DB.prepare("UPDATE connector_instances SET state='CONNECTED',provider_identity=?,verified_scopes=?,last_verified_at=CURRENT_TIMESTAMP,failure_reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND workspace_id=?").bind(verified.identity, JSON.stringify(verified.scopes), row.id, org, workspace),
      ])
      await recordSuccess(env, row, workspace); await audit(env, scope, 'connector.verified', String(row.connector_id), 'Provider identity, permissions, credentials, and health verified', 'CONNECTED')
      return json({ state: 'CONNECTED', provider_identity: verified.identity, verified_scopes: verified.scopes })
    } catch (problem) {
      const detail = problem instanceof Error ? problem.message : 'Connector verification failed'
      await env.DB.batch([
        env.DB.prepare("INSERT INTO connector_health_checks(id,connector_instance_id,organization_id,workspace_id,credentials_valid,permissions_valid,health_valid,latency_ms,detail,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,0,0,0,?,?,?,'ERROR','[]',?)").bind(healthId, row.id, org, workspace, Date.now() - started, detail.slice(0, 500), actor, correlation),
        env.DB.prepare("UPDATE connector_instances SET state='ERROR',failure_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND workspace_id=?").bind(detail.slice(0, 500), row.id, org, workspace),
      ])
      await recordFailure(env, row, workspace, detail); await audit(env, scope, 'connector.verification_failed', String(row.connector_id), detail, 'ERROR')
      return fail(detail, 424)
    }
  }
  if (action === 'revoke' && method === 'POST') {
    const input = await body<{ reason: string }>(request), reason = text(input.reason, 'Revocation reason', 3, 500)
    await env.DB.batch([
      env.DB.prepare("UPDATE connector_instances SET state='REVOKED',status='REVOKED',failure_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND organization_id=? AND workspace_id=?").bind(reason, row.id, org, workspace),
      env.DB.prepare("UPDATE connector_grants SET status='REVOKED',revoked_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE connector_instance_id=? AND workspace_id=? AND status='ACTIVE'").bind(row.id, workspace),
      env.DB.prepare("UPDATE connector_credential_references SET status='REVOKED',updated_at=CURRENT_TIMESTAMP WHERE connector_instance_id=? AND workspace_id=? AND status='ACTIVE'").bind(row.id, workspace),
    ])
    await audit(env, scope, 'connector.revoked', String(row.connector_id), reason, 'REVOKED')
    return json({ state: 'REVOKED' })
  }
  if (action === 'oauth-state' && method === 'POST') {
    if (row.auth_type !== 'oauth2') return fail('Connector does not use OAuth', 422)
    const input = await body<{ redirect_uri: string }>(request), redirect = text(input.redirect_uri, 'Redirect URI', 10, 500), redirectUrl = new URL(redirect)
    if (redirectUrl.origin !== new URL(request.url).origin) return fail('OAuth redirect must remain on this application origin', 422)
    const state = crypto.randomUUID(), stateId = uid()
    await env.DB.prepare("INSERT INTO connector_oauth_states(id,connector_instance_id,organization_id,workspace_id,state_hash,redirect_uri,expires_at,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,datetime('now','+10 minutes'),?,'PENDING','[]',?)").bind(stateId, row.id, org, workspace, await digest(state), redirect, actor, correlation).run()
    return json({ state_id: stateId, state, expires_in_seconds: 600 }, 201)
  }
  if (action === 'grants' && method === 'POST') {
    const input = await body<{ task_id: string; plan_version: number; actions: string[]; resources: string[]; data_classes: string[]; expires_minutes?: number; approved?: boolean; evidence_refs: string[] }>(request)
    const freshHealth = await env.DB.prepare("SELECT id FROM connector_instances WHERE id=? AND organization_id=? AND workspace_id=? AND state='CONNECTED' AND last_verified_at>datetime('now','-15 minutes')").bind(row.id, org, workspace).first()
    if (!freshHealth) return fail('Connector must have fresh live verification before granting access', 403)
    const task = await env.DB.prepare('SELECT id FROM tasks WHERE id=? AND user_id=? AND workspace_id=? AND current_plan_version=?').bind(input.task_id, actor, workspace, input.plan_version).first()
    if (!task) return fail('Grant task and plan version are not current in this workspace', 404)
    const requested = strings(input.actions, 'Actions'), available = await env.DB.prepare('SELECT action_id,classification,approval_required FROM connector_actions WHERE connector_id=? AND connector_version=? AND organization_id=? AND workspace_id=?').bind(row.connector_id, row.connector_version, org, workspace).all<{ action_id: string; classification: string; approval_required: number }>()
    const actionMap = new Map(available.results.map(item => [item.action_id, item]))
    if (requested.some(item => !actionMap.has(item))) return fail('Connector grant requests an unavailable action', 403)
    if (requested.some(item => actionMap.get(item)!.classification !== 'READ' || actionMap.get(item)!.approval_required) && !input.approved) return fail('External write or privileged connector actions require explicit approval', 403)
    const evidence = strings(input.evidence_refs, 'Evidence references'); if (!evidence.length) return fail('Connector grants require approval evidence', 422)
    const grantId = uid(), minutes = Math.max(5, Math.min(Number(input.expires_minutes || 60), 1440)), expires = new Date(Date.now() + minutes * 60000).toISOString()
    await env.DB.prepare("INSERT INTO connector_grants(id,connector_instance_id,organization_id,workspace_id,task_id,plan_version,actor_scope,actions_json,resources_json,data_classes_json,expires_at,approved_by,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,'task',?,?,?,?,?,?, 'ACTIVE',?,?)")
      .bind(grantId, row.id, org, workspace, input.task_id, input.plan_version, JSON.stringify(requested), JSON.stringify(strings(input.resources, 'Resources')), JSON.stringify(strings(input.data_classes, 'Data classes')), expires, actor, actor, JSON.stringify(evidence), correlation).run()
    await audit(env, { ...scope, taskId: input.task_id, planVersion: input.plan_version }, 'connector.grant_created', String(row.connector_id), 'Scoped expiring grant created', 'ACTIVE')
    return json({ grant_id: grantId, expires_at: expires, status: 'ACTIVE' }, 201)
  }
  if (action === 'invoke' && method === 'POST') {
    const input = await body<{ grant_id: string; action_id: string; target: string; parameters?: Record<string, unknown>; idempotency_key: string }>(request), key = text(input.idempotency_key, 'Idempotency key', 8, 120)
    const freshHealth = await env.DB.prepare("SELECT id FROM connector_instances WHERE id=? AND organization_id=? AND workspace_id=? AND state='CONNECTED' AND last_verified_at>datetime('now','-15 minutes')").bind(row.id, org, workspace).first()
    if (!freshHealth) return fail('Connector does not have fresh live verification', 403)
    await rateLimit(env, row, workspace); await circuitAllowed(env, row, workspace)
    const grant = await env.DB.prepare("SELECT * FROM connector_grants WHERE id=? AND connector_instance_id=? AND organization_id=? AND workspace_id=? AND status='ACTIVE' AND expires_at>CURRENT_TIMESTAMP").bind(input.grant_id, row.id, org, workspace).first<Record<string, unknown>>()
    if (!grant || !JSON.parse(String(grant.actions_json)).includes(input.action_id)) return fail('No current connector grant authorizes this action', 403)
    const resources = JSON.parse(String(grant.resources_json)) as string[]
    if (!resources.includes('*') && !resources.includes(input.target)) return fail('Connector target is outside the granted resources', 403)
    const existing = await env.DB.prepare('SELECT * FROM connector_idempotency_records WHERE connector_instance_id=? AND workspace_id=? AND idempotency_key=?').bind(row.id, workspace, key).first<Record<string, unknown>>()
    const requestDigest = await digest(JSON.stringify({ action: input.action_id, target: input.target, parameters: input.parameters || {} }))
    if (existing) {
      if (existing.request_digest !== requestDigest) return fail('Idempotency key was used for a different connector request', 409)
      return json({ invocation_id: existing.invocation_id, idempotent: true, status: existing.response_status, summary: existing.response_summary })
    }
    const invocationId = uid(), target = text(input.target, 'Target', 1, 500)
    await env.DB.prepare("INSERT INTO connector_invocations(id,connector_instance_id,grant_id,organization_id,workspace_id,task_id,plan_version,action_id,target,request_digest,actor_user_id,status,evidence_refs,correlation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,'RUNNING','[]',?)").bind(invocationId, row.id, input.grant_id, org, workspace, grant.task_id, grant.plan_version, input.action_id, target, requestDigest, actor, correlation).run()
    try {
      const token = secret(env, row.credential_reference); let summary: Record<string, unknown>
      if (row.connector_id === 'mcp' && input.action_id === 'metadata.read') summary = { name: 'CyberScool', transport: 'https', verified: true }
      else if (row.connector_id === 'github' && input.action_id === 'repository.read' && token) {
        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(target)) throw new Error('GitHub target must be owner/repository')
        const response = await fetchWithRetry(`https://api.github.com/repos/${target}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'CyberScool/1.0' } }, Number(row.max_retries), Number(row.timeout_ms))
        if (!response.ok) throw new Error(`GitHub returned ${response.status}`)
        const data = await response.json<{ id?: number; full_name?: string; default_branch?: string; private?: boolean }>()
        summary = { provider_id: data.id, full_name: data.full_name, default_branch: data.default_branch, private: data.private }
      } else if (row.connector_id === 'cloudflare' && input.action_id === 'account.read' && token && env.CLOUDFLARE_ACCOUNT_ID) summary = { account_id: env.CLOUDFLARE_ACCOUNT_ID, verified: true }
      else throw new Error('Connector action adapter is unavailable')
      const responseSummary = JSON.stringify(summary).slice(0, 2000)
      await env.DB.batch([
        env.DB.prepare("UPDATE connector_invocations SET status='SUCCEEDED',response_status=200,attempt_count=1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=?").bind(invocationId, workspace),
        env.DB.prepare('INSERT INTO connector_idempotency_records(connector_instance_id,workspace_id,idempotency_key,request_digest,invocation_id,response_status,response_summary) VALUES(?,?,?,?,?,200,?)').bind(row.id, workspace, key, requestDigest, invocationId, responseSummary),
      ])
      await recordSuccess(env, row, workspace); await audit(env, { ...scope, taskId: String(grant.task_id), planVersion: Number(grant.plan_version) }, 'connector.invoked', `${row.connector_id}:${input.action_id}`, 'Read action succeeded', 'SUCCEEDED')
      return json({ invocation_id: invocationId, idempotent: false, status: 200, summary })
    } catch (problem) {
      const detail = problem instanceof Error ? problem.message : 'Connector invocation failed'
      await env.DB.prepare("UPDATE connector_invocations SET status='FAILED',response_status=502,attempt_count=1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=?").bind(invocationId, workspace).run()
      await recordFailure(env, row, workspace, detail); await audit(env, { ...scope, taskId: String(grant.task_id), planVersion: Number(grant.plan_version) }, 'connector.invocation_failed', `${row.connector_id}:${input.action_id}`, detail, 'FAILED')
      return fail(detail, 502)
    }
  }
  return fail('Connector operation not supported', 405)
}
