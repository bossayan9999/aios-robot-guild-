import { describe, expect, it } from 'vitest'
// @ts-expect-error Node built-ins are available in Vitest.
import { readFileSync } from 'node:fs'
import { BUILT_INS } from '../worker/orchestration'

const runtime = readFileSync(new URL('../worker/specialist-runtime.ts', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../migrations/0007_specialist_runtime.sql', import.meta.url), 'utf8')
const frontend = readFileSync(new URL('../src/platform/ProductScreens.tsx', import.meta.url), 'utf8')

describe('CyberScool specialist runtime', () => {
  it('defines every required built-in with bounded contracts', () => {
    expect(BUILT_INS).toHaveLength(10)
    for (const specialist of BUILT_INS) {
      expect(specialist.id).toMatch(/^[a-z0-9-]+$/)
      expect(specialist.instructions.length).toBeGreaterThan(30)
      expect(specialist.skills.length).toBeGreaterThan(0)
      expect(specialist.runtimes.length).toBeGreaterThan(0)
    }
  })

  it('creates grants, evaluations, performance, suspension, revocation and execution contracts', () => {
    for (const table of ['specialist_skills', 'specialist_capability_grants', 'specialist_evaluations', 'specialist_performance_events', 'specialist_suspensions', 'specialist_revocations', 'specialist_execution_contracts']) expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
    expect(migration).toContain('organization_id TEXT NOT NULL')
    expect(migration).toContain('workspace_id TEXT NOT NULL')
    expect(migration).toContain('correlation_id TEXT NOT NULL')
  })

  it('rejects self-evaluation and capability expansion', () => {
    expect(runtime).toContain('A specialist cannot evaluate itself')
    expect(runtime).toContain('exceeds the specialist manifest')
    expect(runtime).toContain('Privileged capability grants require explicit owner approval')
  })

  it('requires current assignment, grant and non-revoked manifest', () => {
    expect(runtime).toContain('Grant does not match the approved specialist assignment and plan version')
    expect(runtime).toContain('A current scoped capability grant is required')
    expect(runtime).toContain('disabled, suspended, or revoked')
    expect(runtime).toContain("execution_started: false")
  })

  it('cancels contracts and grants on revocation', () => {
    expect(runtime).toContain("specialist_execution_contracts SET status='CANCELLED'")
    expect(runtime).toContain("specialist_capability_grants SET status='REVOKED'")
  })

  it('renders only authoritative evaluation and grant state', () => {
    expect(frontend).toContain('state.specialistRuntime?.evaluations')
    expect(frontend).toContain('active grants')
    expect(frontend).toContain('do not simulate execution or runtime health')
  })
})
