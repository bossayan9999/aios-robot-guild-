import { describe, expect, it } from 'vitest'
// @ts-expect-error Node built-ins are available in the Vitest runtime; the browser bundle intentionally omits Node types.
import { readFileSync } from 'node:fs'
import { canTransition, REQUIRED_GATES, TASK_STATES, workspaceFromRequest } from '../worker/task-engine'

const engine = readFileSync(new URL('../worker/task-engine.ts', import.meta.url), 'utf8')
const worker = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../migrations/0005_core_task_engine.sql', import.meta.url), 'utf8')
const frontend = readFileSync(new URL('../src/platform/MissionScreens.tsx', import.meta.url), 'utf8')

describe('CyberScool core task engine', () => {
  it('allows only explicit valid transitions', () => {
    expect(canTransition('CREATED', 'PLANNING')).toBe(true)
    expect(canTransition('RUNNING', 'TESTING')).toBe(true)
    expect(canTransition('REPAIRING', 'RUNNING')).toBe(true)
    expect(canTransition('VALIDATING', 'SECURITY_REVIEW')).toBe(true)
    expect(canTransition('SECURITY_REVIEW', 'WAITING_FOR_COMPLETION_APPROVAL')).toBe(true)
    expect(canTransition('CREATED', 'RUNNING')).toBe(false)
    expect(canTransition('RUNNING', 'COMPLETED')).toBe(false)
    expect(canTransition('WAITING_FOR_COMPLETION_APPROVAL', 'COMPLETED')).toBe(false)
  })

  it('includes cancellation and every canonical state', () => {
    expect(canTransition('PLANNING', 'CANCELLED')).toBe(true)
    expect(canTransition('CANCELLED', 'RUNNING')).toBe(false)
    expect(TASK_STATES).toContain('BLOCKED')
    expect(TASK_STATES).toContain('ROLLED_BACK')
    expect(TASK_STATES).toHaveLength(18)
  })

  it('requires all seven completion gates and blocks direct completion', () => {
    expect(REQUIRED_GATES).toEqual(['implementation', 'tests', 'validation', 'specialist_review', 'security_review', 'evidence_capture', 'approvals'])
    expect(engine).toContain("input.to_state === 'COMPLETED'")
    expect(engine).toContain('Completion blocked; missing gates:')
    expect(engine).toContain("task.state !== 'WAITING_FOR_COMPLETION_APPROVAL'")
  })

  it('requires task-owned evidence before a gate can pass', () => {
    expect(engine).toContain('Passed gates require task evidence')
    expect(engine).toContain('Evidence does not belong to this task, workspace, and plan version')
    expect(engine).toContain('evidence_capture')
  })

  it('makes transitions and approvals idempotent', () => {
    expect(migration).toContain('UNIQUE(task_id, idempotency_key)')
    expect(engine).toContain('Idempotency key was already used for another transition')
    expect(engine).toContain('idempotent: true')
  })

  it('keeps task endpoints authenticated and workspace scoped', () => {
    expect(worker.indexOf('const owner = await requireUser(request, env)')).toBeLessThan(worker.indexOf("url.pathname.startsWith('/api/tasks')"))
    expect(engine).toContain('WHERE id=? AND user_id=? AND workspace_id=?')
    expect(engine).toContain('Task not found in this workspace')
    expect(workspaceFromRequest(new Request('https://example.com/api/tasks', { headers: { 'X-Workspace-ID': 'workspace-a' } }), 7)).toBe('workspace-a')
    expect(workspaceFromRequest(new Request('https://example.com/api/tasks'), 7)).toBe('owner-7')
  })

  it('creates every required durable task record', () => {
    for (const table of ['tasks', 'task_plan_versions', 'task_steps', 'task_dependencies', 'task_state_events', 'task_assignments', 'task_gates', 'task_evidence', 'specialist_reviews', 'security_reviews', 'completion_approvals']) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`)
    }
  })

  it('renders completion as backend controlled', () => {
    expect(frontend).toContain('The frontend cannot set COMPLETED')
    expect(frontend).toContain("case 'WAITING_FOR_COMPLETION_APPROVAL'")
    expect(frontend).toContain('state.approveCompletion()')
    expect(frontend).not.toContain("transitionTask('COMPLETED'")
  })
})
