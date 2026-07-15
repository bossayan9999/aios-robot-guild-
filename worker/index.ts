import { cookieValue, hashPassword, randomHex, sha256, verifyPassword } from './security'

interface Env { DB: D1Database; ASSETS: Fetcher; OPENROUTER_API_KEY?: string; OPENROUTER_MODEL?: string }
type AgentId = 'router' | 'planner' | 'builder' | 'tester' | 'reviewer'
interface Mission { id: string; user_id: number; title: string; repository: string; status: string; plan: string; result?: string; created_at: string; updated_at: string }
interface EventRecord { id?: number; mission_id: string; agent: AgentId; event_type: string; message: string; progress: number; evidence?: string; created_at?: string }

const COOKIE = 'aios_session'
const json = (body: unknown, status = 200, headers: HeadersInit = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
const error = (message: string, status = 400) => json({ error: message }, status)

function secureCookie(request: Request, value: string, maxAge = 604800) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`
}
function mutationAllowed(request: Request) {
  const origin = request.headers.get('Origin')
  return !origin || origin === new URL(request.url).origin
}
async function body<T>(request: Request): Promise<T> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('JSON request required')
  return request.json<T>()
}
async function userId(request: Request, env: Env) {
  const token = cookieValue(request, COOKIE); if (!token) return null
  const row = await env.DB.prepare("SELECT user_id FROM sessions WHERE token_hash=? AND expires_at > datetime('now')").bind(await sha256(token)).first<{ user_id: number }>()
  return row?.user_id || null
}
async function requireUser(request: Request, env: Env) { const id = await userId(request, env); if (!id) throw new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json' } }); return id }
async function missionForUser(env: Env, id: string, owner: number) { return env.DB.prepare('SELECT * FROM missions WHERE id=? AND user_id=?').bind(id, owner).first<Mission>() }
async function eventsForMission(env: Env, id: string) { return (await env.DB.prepare('SELECT * FROM mission_events WHERE mission_id=? ORDER BY id').bind(id).all<EventRecord>()).results }
async function addEvent(env: Env, event: EventRecord) { await env.DB.prepare('INSERT INTO mission_events(mission_id,agent,event_type,message,progress,evidence) VALUES(?,?,?,?,?,?)').bind(event.mission_id, event.agent, event.event_type, event.message, event.progress, event.evidence || null).run() }

function repositoryParts(raw: string) {
  const url = new URL(raw)
  if (url.protocol !== 'https:' || url.hostname !== 'github.com') throw new Error('Use a public https://github.com/owner/repository URL')
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/')
  if (parts.length !== 2 || !parts.every(part => /^[A-Za-z0-9_.-]+$/.test(part))) throw new Error('Repository URL must contain one owner and repository name')
  return { owner: parts[0], repo: parts[1], api: `https://api.github.com/repos/${parts[0]}/${parts[1]}` }
}
async function githubJson(url: string) {
  const response = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'AIOS-Robot-Guild/1.0' } })
  if (!response.ok) throw new Error(response.status === 404 ? 'Public repository not found' : `GitHub returned ${response.status}`)
  return response.json<Record<string, unknown>>()
}
async function planMission(env: Env, title: string, repository: string) {
  const safe = '1. Router validates the public GitHub repository.\n2. Planner reads public metadata and maps read-only checks.\n3. Builder inventories root project signals without modifying files.\n4. Tester records build and security readiness evidence.\n5. Reviewer stops for a human decision.'
  if (!env.OPENROUTER_API_KEY) return safe
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AIOS Robot Guild' }, body: JSON.stringify({ model: env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini', temperature: 0.1, messages: [{ role: 'user', content: `Create at most five concise, read-only public-source steps for this repository health quest. Never propose writes or code execution. Goal: ${title}. Repository: ${repository}` }] }) })
    if (!response.ok) return safe
    const data = await response.json<{ choices?: { message?: { content?: string } }[] }>()
    return data.choices?.[0]?.message?.content || safe
  } catch { return safe }
}

async function copilotAnswer(env: Env, question: string) {
  const local = question.toLowerCase().includes('terminal')
    ? 'Open Developer Studio, download the localhost companion, start it inside your project folder, pair with the one-time code, and approve one allowlisted command at a time.'
    : question.toLowerCase().includes('model')
      ? 'Open AI Models to search providers. Configure the selected provider only through Cloudflare encrypted secrets; never put keys in browser storage.'
      : 'Turn the request into a scoped quest, inspect the plan, approve the allowed actions, watch the specialist handoffs, and review the final evidence.'
  if (!env.OPENROUTER_API_KEY) return local
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AIOS Forge Copilot' }, body: JSON.stringify({ model: env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini', temperature: .2, messages: [{ role: 'system', content: 'You are Forge, the concise developer Copilot inside AIOS Robot Guild. Explain architecture, planning, debugging, testing, and deployment safely. Never claim you executed a tool unless evidence is provided. Never ask the user to paste secrets. Terminal work must use the localhost companion allowlist and explicit confirmation. Keep answers under 180 words.' }, { role: 'user', content: question }] }) })
    if (!response.ok) return local
    const data = await response.json<{ choices?: { message?: { content?: string } }[] }>()
    return data.choices?.[0]?.message?.content || local
  } catch { return local }
}

async function runInspection(env: Env, mission: Mission) {
  const { api } = repositoryParts(mission.repository)
  const repo = await githubJson(api)
  const contentResponse = await fetch(`${api}/contents`, { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'AIOS-Robot-Guild/1.0' } })
  const contents = contentResponse.ok ? await contentResponse.json<{ name: string; type: string }[]>() : []
  const names = Array.isArray(contents) ? contents.map(item => item.name).slice(0, 40) : []
  const signals = ['package.json', 'README.md', 'wrangler.jsonc', 'vite.config.ts', 'tests', '.github'].filter(name => names.includes(name))
  const events: EventRecord[] = [
    { mission_id: mission.id, agent: 'router', event_type: 'repository_validated', message: 'Public GitHub repository resolved.', progress: 20, evidence: `default_branch=${String(repo.default_branch || 'unknown')}` },
    { mission_id: mission.id, agent: 'planner', event_type: 'metadata_collected', message: 'Public repository metadata recorded.', progress: 40, evidence: `language=${String(repo.language || 'unknown')} • stars=${String(repo.stargazers_count || 0)} • open_issues=${String(repo.open_issues_count || 0)}` },
    { mission_id: mission.id, agent: 'builder', event_type: 'root_inventory', message: 'Root project signals inventoried without downloading or modifying code.', progress: 60, evidence: names.length ? names.join(', ') : 'No public root listing available.' },
    { mission_id: mission.id, agent: 'tester', event_type: 'readiness_check', message: signals.length ? 'Build and quality signals found.' : 'No standard build/test signals found at repository root.', progress: 80, evidence: signals.join(', ') || 'none' },
    { mission_id: mission.id, agent: 'reviewer', event_type: 'human_gate', message: 'Evidence ready. No change, merge, or deployment was performed.', progress: 100 },
  ]
  for (const event of events) await addEvent(env, event)
  const result = `Read-only inspection complete. ${signals.length} project readiness signal(s) found. Human review is required before implementation.`
  await env.DB.prepare("UPDATE missions SET status='review_required',result=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(result, mission.id).run()
  return result
}

async function apiHandler(request: Request, env: Env) {
  const url = new URL(request.url), method = request.method
  if (method !== 'GET' && !mutationAllowed(request)) return error('Cross-origin mutation blocked', 403)
  if (url.pathname === '/api/health' && method === 'GET') return json({ ok: true, service: 'AIOS Robot Guild', version: '1.0.0' })
  if (url.pathname === '/api/auth/status' && method === 'GET') {
    const id = await userId(request, env); const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>()
    const user = id ? await env.DB.prepare('SELECT email FROM users WHERE id=?').bind(id).first<{ email: string }>() : null
    return json({ authenticated: Boolean(user), setup_required: Number(count?.count || 0) === 0, email: user?.email })
  }
  if (url.pathname === '/api/auth/setup' && method === 'POST') {
    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>(); if (Number(count?.count || 0) > 0) return error('Owner already exists', 409)
    const input = await body<{ email: string; password: string }>(request); const email = input.email?.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || input.password?.length < 10) return error('Valid email and password of at least 10 characters required', 422)
    const password = await hashPassword(input.password); const inserted = await env.DB.prepare('INSERT INTO users(email,password_hash,password_salt) VALUES(?,?,?) RETURNING id').bind(email, password.hash, password.salt).first<{ id: number }>()
    const token = randomHex(); await env.DB.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now','+7 days'))").bind(await sha256(token), inserted!.id).run()
    return json({ ok: true }, 200, { 'Set-Cookie': secureCookie(request, token) })
  }
  if (url.pathname === '/api/auth/login' && method === 'POST') {
    const input = await body<{ email: string; password: string }>(request); const found = await env.DB.prepare('SELECT id,password_hash,password_salt FROM users WHERE email=?').bind(input.email?.trim().toLowerCase()).first<{ id: number; password_hash: string; password_salt: string }>()
    if (!found || !(await verifyPassword(input.password || '', found.password_salt, found.password_hash))) return error('Invalid email or password', 401)
    const token = randomHex(); await env.DB.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now','+7 days'))").bind(await sha256(token), found.id).run()
    return json({ ok: true }, 200, { 'Set-Cookie': secureCookie(request, token) })
  }
  if (url.pathname === '/api/auth/logout' && method === 'POST') {
    const token = cookieValue(request, COOKIE); if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(token)).run()
    return json({ ok: true }, 200, { 'Set-Cookie': secureCookie(request, '', 0) })
  }
  const owner = await requireUser(request, env)
  if (url.pathname === '/api/copilot' && method === 'POST') {
    const input = await body<{ question: string }>(request)
    if (!input.question?.trim() || input.question.length > 1000) return error('Question must contain 1 to 1000 characters', 422)
    return json({ answer: await copilotAnswer(env, input.question.trim()) })
  }
  if (url.pathname === '/api/missions' && method === 'GET') { const rows = await env.DB.prepare('SELECT * FROM missions WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(owner).all<Mission>(); return json({ missions: rows.results }) }
  if (url.pathname === '/api/missions' && method === 'POST') {
    const input = await body<{ title: string; repository: string }>(request); if (!input.title?.trim() || input.title.length > 180) return error('Mission goal is required', 422)
    try { repositoryParts(input.repository) } catch (problem) { return error(problem instanceof Error ? problem.message : 'Invalid repository', 422) }
    const id = crypto.randomUUID().replaceAll('-', '').slice(0, 12), plan = await planMission(env, input.title.trim(), input.repository)
    await env.DB.prepare("INSERT INTO missions(id,user_id,title,repository,status,plan) VALUES(?,?,?,?, 'awaiting_approval', ?)").bind(id, owner, input.title.trim(), input.repository, plan).run()
    await addEvent(env, { mission_id: id, agent: 'planner', event_type: 'plan_created', message: 'Read-only plan created. Human approval is required.', progress: 10 })
    return json({ mission: await missionForUser(env, id, owner), events: await eventsForMission(env, id) })
  }
  const match = url.pathname.match(/^\/api\/missions\/([a-f0-9]{12})(?:\/(approval|run))?$/)
  if (match) {
    const mission = await missionForUser(env, match[1], owner); if (!mission) return error('Mission not found', 404)
    if (!match[2] && method === 'GET') return json({ mission, events: await eventsForMission(env, mission.id) })
    if (match[2] === 'approval' && method === 'POST') {
      const input = await body<{ decision: string }>(request); if (!['approved', 'rejected'].includes(input.decision)) return error('Decision must be approved or rejected', 422)
      if (mission.status !== 'awaiting_approval') return error('Mission is not awaiting approval', 409)
      await env.DB.batch([env.DB.prepare('INSERT INTO approvals(mission_id,user_id,decision) VALUES(?,?,?)').bind(mission.id, owner, input.decision), env.DB.prepare('UPDATE missions SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(input.decision, mission.id)])
      return json({ mission: await missionForUser(env, mission.id, owner) })
    }
    if (match[2] === 'run' && method === 'POST') {
      if (mission.status !== 'approved') return error('Approval is required before running', 403)
      try { await env.DB.prepare("UPDATE missions SET status='running',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(mission.id).run(); await runInspection(env, mission); return json({ mission: await missionForUser(env, mission.id, owner), events: await eventsForMission(env, mission.id) }) } catch (problem) { await env.DB.prepare("UPDATE missions SET status='failed',result=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(problem instanceof Error ? problem.message : 'Inspection failed', mission.id).run(); return error(problem instanceof Error ? problem.message : 'Inspection failed', 502) }
    }
  }
  return error('API route not found', 404)
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    if (url.pathname === '/mcp') return json({ name: 'AIOS Robot Guild', protocolVersion: '2025-06-18', transport: 'https', tools: [{ name: 'repository_health', description: 'Approval-gated read-only public GitHub inspection' }], authentication: 'owner session required for execution' })
    if (url.pathname.startsWith('/api/')) { try { return await apiHandler(request, env) } catch (problem) { if (problem instanceof Response) return problem; return error(problem instanceof Error ? problem.message : 'Unexpected error', 500) } }
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
