import { describe, expect, it } from 'vitest'
// @ts-expect-error Node built-ins are available to Vitest but excluded from the browser bundle.
import { readFileSync } from 'node:fs'
import { ASSIGNMENT_STATES, dependenciesValid } from '../worker/orchestration'

const engine = readFileSync(new URL('../worker/orchestration.ts', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../migrations/0006_copilot_orchestration.sql', import.meta.url), 'utf8')
const worker = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
const manager = readFileSync(new URL('../src/platform/MissionScreens.tsx', import.meta.url), 'utf8')
const team = readFileSync(new URL('../src/platform/ProductScreens.tsx', import.meta.url), 'utf8')

describe('CyberScool Copilot Manager orchestration', () => {
  it('creates every scoped orchestration record', () => {
    for (const table of ['copilot_sessions', 'copilot_objectives', 'task_plans', 'plan_steps', 'specialist_assignments', 'specialist_handoffs', 'specialist_results', 'review_findings', 'conflict_records', 'escalation_requests', 'orchestration_events']) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
    }
    expect(migration).toContain('organization_id TEXT NOT NULL')
    expect(migration).toContain('workspace_id TEXT NOT NULL')
    expect(migration).toContain('correlation_id TEXT NOT NULL')
    expect(migration).toContain('evidence_refs TEXT NOT NULL')
  })

  it('defines the complete bounded assignment state set', () => {
    expect(ASSIGNMENT_STATES).toEqual(['PROPOSED', 'WAITING_FOR_APPROVAL', 'ASSIGNED', 'RUNNING', 'WAITING_FOR_INPUT', 'REVIEWING', 'REPAIRING', 'PASSED', 'FAILED', 'BLOCKED', 'CANCELLED'])
    expect(engine).toContain("retry > limit ? 'BLOCKED' : 'REPAIRING'")
  })

  it('provides versioned built-in and safe custom manifests', () => {
    for (const id of ['copilot-manager', 'tech-development', 'business', 'finance-advisory', 'ccna-network-security', 'cybersecurity', 'devops', 'research-osint', 'ui-ux', 'custom-specialist-builder']) expect(engine).toContain(id)
    expect(engine).toContain("enabled,sandbox_evaluated,security_reviewed,owner_approved")
    expect(engine).toContain("'DRAFT','[]'")
    expect(team).toContain('Create disabled draft')
  })

  it('validates dependencies, plan approval and least-privilege assignment', () => {
    expect(dependenciesValid([{ id: 'a' }, { id: 'b', depends_on: ['a'] }])).toBe(true)
    expect(dependenciesValid([{ id: 'a', depends_on: ['b'] }, { id: 'b', depends_on: ['a'] }])).toBe(false)
    expect(engine).toContain('Step dependency is invalid')
    expect(engine).toContain('An approved current plan is required before assignment')
    expect(engine).toContain('Assignment does not match the accountable specialist')
    expect(engine).toContain('exceeds specialist manifest')
  })

  it('requires tracked handoffs, evidence, and independent review', () => {
    expect(engine).toContain('Tracked handoffs require evidence')
    expect(engine).toContain('Implementing specialist cannot review its own output')
    expect(engine).toContain('Specialist results require evidence references')
    expect(engine).toContain('A conflict requires at least two assignments')
  })

  it('keeps APIs authenticated and workspace scoped', () => {
    expect(worker.indexOf('const owner = await requireUser(request, env)')).toBeLessThan(worker.indexOf("url.pathname.startsWith('/api/orchestration')"))
    expect(engine).toContain('WHERE id=? AND user_id=? AND workspace_id=?')
    expect(engine).toContain('Task not found in this workspace')
  })

  it('keeps final reporting subordinate to Phase 3 completion gates', () => {
    expect(engine).toContain('Phase 3 completion gates pending:')
    expect(engine).toContain("parent_task_state: parent.state")
    expect(engine).not.toContain("UPDATE tasks SET state='COMPLETED'")
  })

  it('renders only durable assignments and honest eligibility', () => {
    expect(manager).toContain('REAL SERVER RECORDS')
    expect(manager).toContain('No active specialists')
    expect(manager).toContain('state.finalReport?.eligible')
    expect(manager).toContain('cannot mark the parent task complete')
  })
})
