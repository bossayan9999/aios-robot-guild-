const base = (process.env.AIOS_BASE_URL || 'https://aios-robot-guild.bossayan-apps.workers.dev').replace(/\/$/, '')

async function check(path, expected, inspect) {
  const response = await fetch(`${base}${path}`, { redirect: 'error' })
  if (!expected.includes(response.status)) throw new Error(`${path}: expected ${expected.join('/')} but received ${response.status}`)
  const body = await response.text()
  if (inspect) inspect(body, response)
  console.log(`PASS ${String(response.status).padEnd(3)} ${path}`)
}

await check('/', [200], (body) => { if (!body.includes('CyberScool')) throw new Error('CyberScool app shell title missing') })
await check('/api/health', [200], (body) => {
  const health = JSON.parse(body)
  if (!health.ok || health.checks?.database !== 'pass') throw new Error('Worker or D1 health failed')
})
await check('/api/auth/status', [200], (body) => { if (typeof JSON.parse(body).authenticated !== 'boolean') throw new Error('Auth status malformed') })
await check('/api/missions', [401])
await check('/api/tasks', [401])
await check('/api/orchestration/specialists', [401])
await check('/api/specialist-runtime/registry', [401])
await check('/api/connectors', [401])
await check('/api/skills', [401])
await check('/api/copilot/profile', [401])
await check('/mcp', [200], (body) => { if (!JSON.parse(body).tools?.length) throw new Error('MCP metadata has no tools') })
await check('/manifest.webmanifest', [200], (body) => { if (JSON.parse(body).display !== 'standalone') throw new Error('PWA manifest malformed') })
await check('/service-worker.js', [200], (body) => { if (!body.includes("url.pathname.startsWith('/api/')")) throw new Error('API cache exclusion missing') })
console.log(`Smoke suite complete: ${base}`)
