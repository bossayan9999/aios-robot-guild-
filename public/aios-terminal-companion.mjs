#!/usr/bin/env node
import http from 'node:http'
import { execFile } from 'node:child_process'
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import os from 'node:os'
import { appendFileSync, existsSync, mkdirSync, readFileSync, statfsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const HOST = '127.0.0.1'
const PORT = 4317
const PAIR_CODE = String(randomInt(100000, 999999))
const TOKEN = randomBytes(32).toString('hex')
const LAB_DIR = join(os.tmpdir(), 'aios-authorized-security-lab')
const LAB_FILE = join(LAB_DIR, 'compose.yaml')
const AUDIT_FILE = join(LAB_DIR, 'audit.jsonl')
const LAB_META_FILE = join(LAB_DIR, 'session.json')
let labExpiresAt = null
let labTimer = null
const ALLOWED_ORIGINS = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'https://aios-software-factory.bossayan-apps.workers.dev',
  'https://aios-robot-guild.bossayan-apps.workers.dev',
  ...(process.env.AIOS_ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean),
])
const COMMANDS = new Map([
  ['pwd', { file: process.platform === 'win32' ? 'cmd.exe' : 'pwd', args: process.platform === 'win32' ? ['/d', '/s', '/c', 'cd'] : [] }],
  ['git status --short', { file: 'git', args: ['status', '--short'] }],
  ['npm run lint', { file: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['run', 'lint'] }],
  ['npm test', { file: process.platform === 'win32' ? 'npm.cmd' : 'npm', args: ['test'] }],
])

function send(response, status, payload, origin) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}
async function readJson(request) {
  let value = ''
  for await (const chunk of request) { value += chunk; if (value.length > 16_384) throw new Error('Request too large') }
  return JSON.parse(value || '{}')
}
function validToken(request) {
  const supplied = (request.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const left = Buffer.from(supplied), right = Buffer.from(TOKEN)
  return left.length === right.length && timingSafeEqual(left, right)
}
function capture(file, args = [], timeout = 15_000) {
  return new Promise(resolve => execFile(file, args, { cwd: process.cwd(), timeout, maxBuffer: 128_000, windowsHide: true }, (error, stdout, stderr) => resolve({ ok: !error, output: `${stdout}${stderr}`.trim(), exitCode: typeof error?.code === 'number' ? error.code : error ? 1 : 0 })))
}
function audit(action, detail = {}) {
  mkdirSync(LAB_DIR, { recursive: true, mode: 0o700 })
  appendFileSync(AUDIT_FILE, `${JSON.stringify({ at: new Date().toISOString(), action, ...detail })}\n`, { mode: 0o600 })
}
function labCompose() {
  return `name: aios-authorized-lab
services:
  kali:
    image: kalilinux/kali-rolling:latest
    container_name: aios-lab-kali
    command: ["sleep", "infinity"]
    read_only: true
    cap_drop: ["ALL"]
    security_opt: ["no-new-privileges:true"]
    pids_limit: 128
    mem_limit: 768m
    cpus: 1.0
    tmpfs: ["/tmp:rw,noexec,nosuid,size=128m", "/run:rw,noexec,nosuid,size=32m"]
    networks: [lab]
  target:
    image: bkimminich/juice-shop:latest
    container_name: aios-lab-target
    read_only: true
    cap_drop: ["ALL"]
    security_opt: ["no-new-privileges:true"]
    pids_limit: 192
    mem_limit: 768m
    cpus: 1.0
    tmpfs: ["/tmp:rw,noexec,nosuid,size=128m"]
    networks: [lab]
    ports: ["127.0.0.1:3001:3000"]
networks:
  lab:
    internal: true
`
}
async function destroyLab(reason = 'user_requested') {
  if (labTimer) clearTimeout(labTimer)
  labTimer = null
  const result = existsSync(LAB_FILE) ? await capture('docker', ['compose', '-f', LAB_FILE, 'down', '--volumes', '--remove-orphans'], 120_000) : { ok: true, output: 'No lab session exists.', exitCode: 0 }
  audit('lab_destroyed', { reason, exitCode: result.exitCode })
  labExpiresAt = null
  if (existsSync(LAB_META_FILE)) writeFileSync(LAB_META_FILE, JSON.stringify({ active: false, destroyedAt: new Date().toISOString(), reason }), { mode: 0o600 })
  return result
}
async function labStatus() {
  const docker = await capture('docker', ['version', '--format', '{{.Server.Version}}'])
  const ps = existsSync(LAB_FILE) && docker.ok ? await capture('docker', ['compose', '-f', LAB_FILE, 'ps', '--format', 'json']) : { ok: false, output: '', exitCode: 1 }
  const auditEntries = existsSync(AUDIT_FILE) ? readFileSync(AUDIT_FILE, 'utf8').trim().split('\n').filter(Boolean).slice(-40).map(line => { try { return JSON.parse(line) } catch { return { action: 'invalid_audit_entry' } } }) : []
  return { dockerReady: docker.ok, dockerVersion: docker.ok ? docker.output : null, active: Boolean(labExpiresAt && Date.parse(labExpiresAt) > Date.now()), expiresAt: labExpiresAt, allowlist: ['aios-lab-target', 'target:3000', '127.0.0.1:3001'], externalNetwork: 'blocked', audit: auditEntries, containers: ps.output }
}
async function diagnostics() {
  const npmFile = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const [gitVersion, gitRoot, gitBranch, gitStatus, npmVersion, gitleaks, trivy, semgrep, osvScanner] = await Promise.all([
    capture('git', ['--version']), capture('git', ['rev-parse', '--show-toplevel']), capture('git', ['branch', '--show-current']), capture('git', ['status', '--short']), capture(npmFile, ['--version']),
    capture('gitleaks', ['version']), capture('trivy', ['--version']), capture('semgrep', ['--version']), capture('osv-scanner', ['--version']),
  ])
  let diskFreeBytes = null
  try { const disk = statfsSync(process.cwd()); diskFreeBytes = Number(disk.bavail) * Number(disk.bsize) } catch { /* unavailable on older Node versions */ }
  const nodeMajor = Number(process.versions.node.split('.')[0])
  const securityTools = [
    { id: 'gitleaks', name: 'Gitleaks', installed: gitleaks.ok, version: gitleaks.ok ? gitleaks.output : null, purpose: 'Detect committed or current hard-coded secrets', recommended: true },
    { id: 'trivy', name: 'Trivy', installed: trivy.ok, version: trivy.ok ? trivy.output.split('\n')[0] : null, purpose: 'Check dependencies, files and configuration for known risks', recommended: true },
    { id: 'semgrep', name: 'Semgrep', installed: semgrep.ok, version: semgrep.ok ? semgrep.output : null, purpose: 'Static analysis for insecure code patterns', recommended: true },
    { id: 'osv-scanner', name: 'OSV-Scanner', installed: osvScanner.ok, version: osvScanner.ok ? osvScanner.output.split('\n')[0] : null, purpose: 'Check open-source dependencies against OSV advisories', recommended: existsSync('package-lock.json') },
  ]
  const checks = [
    { id: 'loopback', label: 'Companion network boundary', status: 'pass', detail: `Bound only to ${HOST}:${PORT}` },
    { id: 'node', label: 'Node.js runtime', status: nodeMajor >= 20 ? 'pass' : 'warn', detail: `Node ${process.versions.node}${nodeMajor < 20 ? ' — upgrade to Node 20 or newer' : ''}` },
    { id: 'git', label: 'Git repository', status: gitRoot.ok ? 'pass' : 'fail', detail: gitRoot.ok ? gitRoot.output : 'Working folder is not a Git repository.' },
    { id: 'package', label: 'Project package', status: existsSync('package.json') ? 'pass' : 'warn', detail: existsSync('package.json') ? 'package.json found' : 'package.json not found in working folder' },
    { id: 'changes', label: 'Uncommitted changes', status: !gitStatus.ok ? 'warn' : gitStatus.output ? 'warn' : 'pass', detail: !gitStatus.ok ? 'Git status unavailable' : gitStatus.output || 'Working tree is clean' },
    { id: 'disk', label: 'Free disk space', status: diskFreeBytes !== null && diskFreeBytes < 1_073_741_824 ? 'warn' : 'pass', detail: diskFreeBytes === null ? 'Disk information unavailable' : `${(diskFreeBytes / 1_073_741_824).toFixed(1)} GB available` },
    ...securityTools.filter(tool => tool.recommended).map(tool => ({ id: `security-${tool.id}`, label: `Security Scout • ${tool.name}`, status: tool.installed ? 'pass' : 'warn', detail: tool.installed ? `${tool.purpose} • ${tool.version || 'installed'}` : `${tool.purpose} • optional tool not installed; suggestion only` })),
  ]
  return {
    scannedAt: new Date().toISOString(),
    device: { name: os.hostname(), platform: process.platform, release: os.release(), arch: os.arch(), cpuCores: os.cpus().length, totalMemoryBytes: os.totalmem(), freeMemoryBytes: os.freemem(), uptimeSeconds: os.uptime() },
    project: { path: process.cwd(), gitRoot: gitRoot.ok ? gitRoot.output : null, branch: gitBranch.ok ? gitBranch.output : null, clean: gitStatus.ok && !gitStatus.output, packageFound: existsSync('package.json') },
    tools: { node: process.versions.node, npm: npmVersion.ok ? npmVersion.output : null, git: gitVersion.ok ? gitVersion.output : null },
    securityTools,
    checks,
    summary: checks.some(check => check.status === 'fail') ? 'Action required' : checks.some(check => check.status === 'warn') ? 'Review recommended' : 'Healthy',
  }
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin || ''
  if (!ALLOWED_ORIGINS.has(origin)) return send(response, 403, { error: 'Origin is not allowed. Set AIOS_ALLOWED_ORIGIN before starting the companion.' }, origin)
  if (request.method === 'OPTIONS') return send(response, 204, {}, origin)
  const url = new URL(request.url || '/', `http://${HOST}:${PORT}`)
  try {
    if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { ok: true, service: 'AIOS Local Companion', paired: false, commands: [...COMMANDS.keys()] }, origin)
    if (request.method === 'POST' && url.pathname === '/pair') {
      const input = await readJson(request)
      if (String(input.code || '') !== PAIR_CODE) return send(response, 401, { error: 'Pairing code is incorrect.' }, origin)
      return send(response, 200, { ok: true, token: TOKEN }, origin)
    }
    if (request.method === 'GET' && url.pathname === '/diagnostics') {
      if (!validToken(request)) return send(response, 401, { error: 'Pairing token is missing or invalid.' }, origin)
      return send(response, 200, await diagnostics(), origin)
    }
    if (request.method === 'GET' && url.pathname === '/lab/status') {
      if (!validToken(request)) return send(response, 401, { error: 'Pairing token is missing or invalid.' }, origin)
      return send(response, 200, await labStatus(), origin)
    }
    if (request.method === 'POST' && url.pathname === '/lab/start') {
      if (!validToken(request)) return send(response, 401, { error: 'Pairing token is missing or invalid.' }, origin)
      const input = await readJson(request)
      const minutes = Math.max(15, Math.min(120, Number(input.durationMinutes) || 30))
      if (input.approved !== true || input.authorization !== 'I OWN THIS LOCAL LAB') return send(response, 400, { error: 'Explicit authorization and approval are required.' }, origin)
      mkdirSync(LAB_DIR, { recursive: true, mode: 0o700 }); writeFileSync(LAB_FILE, labCompose(), { mode: 0o600 })
      audit('lab_start_approved', { durationMinutes: minutes, allowlist: ['aios-lab-target'] })
      const result = await capture('docker', ['compose', '-f', LAB_FILE, 'up', '-d', '--pull', 'missing', '--force-recreate'], 600_000)
      if (!result.ok) { audit('lab_start_failed', { exitCode: result.exitCode, output: result.output.slice(-1000) }); return send(response, 500, { error: result.output || 'Docker could not start the lab.' }, origin) }
      labExpiresAt = new Date(Date.now() + minutes * 60_000).toISOString()
      writeFileSync(LAB_META_FILE, JSON.stringify({ active: true, expiresAt: labExpiresAt, allowlist: ['aios-lab-target'] }), { mode: 0o600 })
      labTimer = setTimeout(() => { destroyLab('time_limit_reached').catch(() => null) }, minutes * 60_000)
      audit('lab_started', { expiresAt: labExpiresAt })
      return send(response, 200, await labStatus(), origin)
    }
    if (request.method === 'POST' && url.pathname === '/lab/destroy') {
      if (!validToken(request)) return send(response, 401, { error: 'Pairing token is missing or invalid.' }, origin)
      const result = await destroyLab('user_requested')
      return send(response, result.ok ? 200 : 500, { ...(await labStatus()), output: result.output }, origin)
    }
    if (request.method === 'POST' && url.pathname === '/run') {
      if (!validToken(request)) return send(response, 401, { error: 'Pairing token is missing or invalid.' }, origin)
      const input = await readJson(request), selected = COMMANDS.get(String(input.command || ''))
      if (!selected) return send(response, 403, { error: 'Command is not on the allowlist.' }, origin)
      return execFile(selected.file, selected.args, { cwd: process.cwd(), timeout: 120_000, maxBuffer: 512_000, windowsHide: true }, (error, stdout, stderr) => {
        const exitCode = typeof error?.code === 'number' ? error.code : error ? 1 : 0
        send(response, 200, { command: input.command, exitCode, output: `${stdout}${stderr}`.slice(-12000) }, origin)
      })
    }
    return send(response, 404, { error: 'Route not found.' }, origin)
  } catch (error) { return send(response, 400, { error: error instanceof Error ? error.message : 'Invalid request.' }, origin) }
})

server.listen(PORT, HOST, () => {
  console.log('\nAIOS Local Companion')
  console.log(`Listening only on http://${HOST}:${PORT}`)
  console.log(`Working folder: ${process.cwd()}`)
  console.log(`One-time pairing code: ${PAIR_CODE}`)
  console.log(`Allowed commands: ${[...COMMANDS.keys()].join(', ')}`)
  console.log('Press Ctrl+C to stop.\n')
  if (existsSync(LAB_META_FILE)) {
    try {
      const previous = JSON.parse(readFileSync(LAB_META_FILE, 'utf8'))
      if (previous.active && previous.expiresAt) {
        const remaining = Date.parse(previous.expiresAt) - Date.now()
        if (remaining <= 0) destroyLab('stale_session_recovered').catch(() => null)
        else { labExpiresAt = previous.expiresAt; labTimer = setTimeout(() => { destroyLab('time_limit_reached').catch(() => null) }, remaining) }
      }
    } catch { audit('lab_recovery_failed') }
  }
})
