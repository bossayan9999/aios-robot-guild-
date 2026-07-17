import { describe, expect, it } from 'vitest'
import { agents, providers } from '../src/data'
// @ts-expect-error Node built-ins are available in the Vitest runtime; the browser bundle intentionally omits Node types.
import { readFileSync } from 'node:fs'

describe('Robot Guild product contract', () => {
  it('keeps the five-stage human-reviewed factory workflow', () => {
    expect(agents.map(agent => agent.id)).toEqual(['router', 'planner', 'builder', 'tester', 'reviewer'])
  })

  it('keeps OpenRouter and local-model discovery available', () => {
    expect(providers.some(provider => provider[0] === 'OpenRouter')).toBe(true)
    expect(providers.some(provider => provider[0] === 'Ollama')).toBe(true)
  })

  it('keeps the authorized lab deny-by-default boundaries', () => {
    const companion = readFileSync(new URL('../public/aios-terminal-companion.mjs', import.meta.url), 'utf8')
    expect(companion).toContain('internal: true')
    expect(companion).toContain('cap_drop: ["ALL"]')
    expect(companion).toContain('no-new-privileges:true')
    expect(companion).toContain("input.authorization !== 'I OWN THIS LOCAL LAB'")
    expect(companion).not.toContain('/var/run/docker.sock')
  })

  it('keeps deployment evidence and browser security headers', () => {
    const worker = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
    expect(worker).toContain('X-Request-ID')
    expect(worker).toContain('Content-Security-Policy')
    expect(worker).toContain('Strict-Transport-Security')
    expect(worker).toContain("const BUILD_ID = '2026.07.18-network1'")
    expect(app).toContain("const UI_BUILD = '2026.07.18-network1'")
  })

  it('emits redacted structured audit events', () => {
    const worker = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
    expect(worker).toContain("event: 'aios.audit'")
    expect(worker).toContain("action: audit.action")
    expect(worker).toContain('duration_ms:')
    expect(worker).toContain("audit.action = 'mission.approval'")
    expect(worker).not.toContain('request.headers.get(\'Authorization\')')
    expect(worker).not.toContain('request.headers.get(\'Cookie\')')
  })

  it('keeps password rotation and passkeys behind authenticated security boundaries', () => {
    const worker = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
    const migration = readFileSync(new URL('../migrations/0003_passkeys.sql', import.meta.url), 'utf8')
    expect(worker).toContain('const owner = await requireUser(request, env)')
    expect(worker.indexOf('const owner = await requireUser(request, env)')).toBeLessThan(worker.indexOf("if (url.pathname === '/api/auth/password'"))
    expect(worker).toContain('verifyRegistrationResponse')
    expect(worker).toContain('verifyAuthenticationResponse')
    expect(worker).toContain("expectedOrigin: url.origin")
    expect(worker).toContain("expectedRPID: url.hostname")
    expect(worker).toContain("DELETE FROM sessions WHERE user_id=?")
    expect(app).toContain('Sign in with a passkey')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS passkey_credentials')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS passkey_challenges')
  })

  it('keeps release automation durable, owner-scoped and approval-gated', () => {
    const worker = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
    const migration = readFileSync(new URL('../migrations/0004_release_center.sql', import.meta.url), 'utf8')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS release_proposals')
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS release_events')
    expect(worker).toContain('WHERE id=? AND user_id=?')
    expect(worker).toContain("'approved_waiting_connection'")
    expect(worker).toContain('repository-scoped GitHub App')
    expect(app).toContain('No code will be changed by this approval')
    expect(app).toContain('It never edits GitHub or deploys production')
    expect(worker).not.toContain('git push')
  })

  it('keeps the CCNA guild a safe simulator with subnetting and no live device execution', () => {
    const lab = readFileSync(new URL('../src/CCNANetworkLab.tsx', import.meta.url), 'utf8')
    expect(lab).toContain('Guild Network Topology')
    expect(lab).toContain('IPv4 calculator')
    expect(lab).toContain('Simulation only — no real device was contacted')
    expect(lab).toContain('explicit allowlist')
    expect(lab).not.toContain('fetch(')
  })

})
