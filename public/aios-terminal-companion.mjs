#!/usr/bin/env node
import http from 'node:http'
import { execFile } from 'node:child_process'
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const HOST = '127.0.0.1'
const PORT = 4317
const PAIR_CODE = String(randomInt(100000, 999999))
const TOKEN = randomBytes(32).toString('hex')
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
})
