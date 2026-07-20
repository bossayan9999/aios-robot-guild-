import { useState } from 'react'
import type { FormEvent } from 'react'
import type { TaskState } from '../types'
import type { PlatformState } from './state'
import { EmptyState, Metric, Panel, StatusPill } from './components'

const visualState = (state?: TaskState) => state === 'COMPLETED' ? 'passed' : state === 'FAILED' || state === 'CANCELLED' || state === 'ROLLED_BACK' ? 'failed' : state === 'BLOCKED' || state === 'REPAIRING' || state === 'VALIDATING' || state === 'WAITING_FOR_APPROVAL' || state === 'WAITING_FOR_COMPLETION_APPROVAL' ? 'active' : 'pending'

function TaskActions({ state }: { state: PlatformState }) {
  const task = state.activeTask
  if (!task) return null
  const action = (label: string, run: () => unknown, primary = true) => <button className={primary ? 'cs-button--primary' : ''} disabled={state.busy} onClick={() => void run()}>{state.busy ? 'Recording…' : label}</button>
  switch (task.state) {
    case 'CREATED': return action('Create plan', () => state.savePlan('1. Confirm scope and acceptance criteria.\n2. Assign the least-privileged specialist.\n3. Execute in an approved sandbox.\n4. Test and validate the result.\n5. Complete specialist and security reviews.\n6. Present evidence for owner approval.'))
    case 'PLANNING': return action('Request plan approval', () => state.transitionTask('WAITING_FOR_APPROVAL', 'Plan is ready for owner approval.'))
    case 'WAITING_FOR_APPROVAL': return <div className="cs-actions">{action('Cancel', () => state.cancelTask(), false)}{action('Approve & assign', () => state.approvePlanAndAssign())}</div>
    case 'ASSIGNED': return action('Provision sandbox', () => state.transitionTask('SANDBOX_PROVISIONING', 'Approved assignment is ready for sandbox provisioning.'))
    case 'SANDBOX_PROVISIONING': return action('Start bounded execution', () => state.transitionTask('RUNNING', 'Sandbox capability envelope verified.'))
    case 'RUNNING': return action('Submit for testing', () => state.transitionTask('TESTING', 'Implementation work submitted for tests.'))
    case 'TESTING': return action('Submit for specialist review', () => state.transitionTask('REVIEWING', 'Tests completed; specialist review requested.'))
    case 'REVIEWING': return action('Pass review & validate', () => state.reviewAndValidate())
    case 'REPAIRING': return action('Resume bounded execution', () => state.transitionTask('RUNNING', 'Revision findings addressed; execution resumed.'))
    case 'VALIDATING': return action('Record evidence & security review', () => state.validateAndRequestSecurityReview())
    case 'STAGING': return action('Start security review', () => state.transitionTask('SECURITY_REVIEW', 'Staged artifact is ready for security review.'))
    case 'SECURITY_REVIEW': return action('Pass security review', () => state.passSecurityReview())
    case 'WAITING_FOR_COMPLETION_APPROVAL': return action('Approve completed result', () => state.approveCompletion())
    case 'COMPLETED': return <StatusPill state="passed">Verified complete</StatusPill>
    default: return <StatusPill state={visualState(task.state)}>{task.state.replaceAll('_', ' ')}</StatusPill>
  }
}

export function NewTaskForm({ state, compact = false }: { state: PlatformState; compact?: boolean }) {
  const [title, setTitle] = useState('Build a verified CyberScool capability')
  const [description, setDescription] = useState('Define, implement, test, review, and evidence the requested capability without bypassing owner control.')
  function submit(event: FormEvent) { event.preventDefault(); void state.createTask(title, description) }
  return <form className={`cs-task-form ${compact ? 'cs-task-form--compact' : ''}`} onSubmit={submit}>
    <label>Objective<input value={title} onChange={event => setTitle(event.target.value)} minLength={3} maxLength={180} required /></label>
    <label>Acceptance context<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={4000} /></label>
    <button className="cs-button--primary" disabled={state.busy}>{state.busy ? 'Creating…' : 'Create controlled task'}</button>
  </form>
}

export function MissionControl({ state, navigate }: { state: PlatformState; navigate: (route: 'copilot-manager' | 'integrations' | 'runtime-center') => void }) {
  const passed = state.gates.filter(gate => gate.state === 'passed').length
  const approvals = state.activeTask && ['WAITING_FOR_APPROVAL', 'WAITING_FOR_COMPLETION_APPROVAL'].includes(state.activeTask.state) ? 1 : 0
  return <div className="cs-screen">
    <section className="cs-hero"><div><p className="cs-eyebrow">CYBERSCOOL CONTROL PLANE</p><h1>Verified work, under your control.</h1><p>Task state, gates, evidence, and approvals now come from the server-authoritative D1 task engine.</p></div><div className="cs-hero__health"><span className={state.health?.ok ? 'is-live' : ''} /><div><strong>{state.health?.ok ? 'Control plane operational' : 'Control plane unavailable'}</strong><small>{state.health ? `Build ${state.health.build} · checked ${new Date(state.health.checked_at).toLocaleTimeString()}` : 'Waiting for backend health'}</small></div></div></section>
    <div className="cs-metrics"><Metric label="Active tasks" value={state.tasks.filter(task => !['COMPLETED', 'CANCELLED', 'ROLLED_BACK'].includes(task.state)).length} detail={`${state.tasks.length} total in workspace`} /><Metric label="Completion gates" value={`${passed}/7`} detail="Authoritative D1 records" tone={passed === 7 ? 'good' : 'neutral'} /><Metric label="Approvals" value={approvals} detail={approvals ? 'Owner action required' : 'No pending decision'} tone={approvals ? 'warn' : 'good'} /><Metric label="Evidence" value={state.taskDetails?.evidence.length || 0} detail="Durable task artifacts" /></div>
    {state.error && <p className="cs-form-error" role="alert">{state.error}</p>}
    <div className="cs-grid cs-grid--main">
      <Panel title="Active task" eyebrow="SERVER-AUTHORITATIVE STATE" action={<TaskActions state={state} />}>{state.activeTask ? <div className="cs-task-summary"><div className="cs-task-summary__title"><div><h3>{state.activeTask.title}</h3><small>Workspace {state.activeTask.workspace_id} · plan v{state.activeTask.current_plan_version}</small></div><StatusPill state={visualState(state.activeTask.state)}>{state.activeTask.state.replaceAll('_', ' ')}</StatusPill></div><p>{state.activeTask.description}</p><pre>{state.taskDetails?.plans[0]?.content || 'No plan version recorded yet.'}</pre></div> : <EmptyState title="No task selected" detail="Create an approval-gated task with Copilot Manager." action={<button className="cs-button--primary" onClick={() => navigate('copilot-manager')}>Open Copilot Manager</button>} />}</Panel>
      <Panel title="Completion gates" eyebrow="D1 POLICY RECORDS"><div className="cs-gates">{state.gates.map(gate => <div className="cs-gate" key={gate.id}><span className={`cs-gate__mark cs-gate__mark--${gate.state}`}>{gate.state === 'passed' ? '✓' : gate.state === 'failed' ? '!' : '·'}</span><div><strong>{gate.label}</strong><small>{gate.evidence}</small></div><StatusPill state={gate.state} /></div>)}</div></Panel>
      <Panel title="State history" eyebrow="CORRELATED AUDIT EVENTS">{state.events.length ? <div className="cs-timeline">{state.events.map(event => <article key={event.id}><span>v{event.plan_version}</span><div><strong>{event.from_state ? `${event.from_state} → ${event.to_state}` : event.to_state}</strong><p>{event.reason}</p><small>{new Date(event.created_at).toLocaleString()} · {event.correlation_id}</small></div></article>)}</div> : <EmptyState title="No state events" detail="The backend records every accepted transition and its correlation ID." />}</Panel>
      <Panel title="Runtime health" eyebrow="VERIFIED CONNECTIONS" action={<button onClick={() => navigate('runtime-center')}>View runtimes</button>}><div className="cs-compact-list">{state.runtimes.slice(0, 3).map(runtime => <div key={runtime.id}><span className={`cs-dot cs-dot--${runtime.state}`} /><div><strong>{runtime.name}</strong><small>{runtime.detail}</small></div><StatusPill state={runtime.state} /></div>)}</div></Panel>
    </div>
  </div>
}

export function CopilotManager({ state }: { state: PlatformState }) {
  const [question, setQuestion] = useState('What is the safest next step for this task?')
  const [messages, setMessages] = useState<{ role: 'manager' | 'user'; text: string }[]>([{ role: 'manager', text: 'I coordinate plans and request server-authoritative transitions. Only the completion service can mark a task completed after every gate passes.' }])
  const [asking, setAsking] = useState(false)
  async function ask(event: FormEvent) { event.preventDefault(); if (!question.trim()) return; const next = question.trim(); setMessages(current => [...current, { role: 'user', text: next }]); setQuestion(''); setAsking(true); try { const result = await state.askCopilot(next); setMessages(current => [...current, { role: 'manager', text: result.answer }]) } catch (problem) { setMessages(current => [...current, { role: 'manager', text: problem instanceof Error ? problem.message : 'Copilot is unavailable.' }]) } finally { setAsking(false) } }
  return <div className="cs-screen"><div className="cs-page-title"><div><p className="cs-eyebrow">ORCHESTRATION</p><h1>Copilot Manager</h1><p>Plan and coordinate work while the control plane owns every transition and gate.</p></div><TaskActions state={state} /></div><div className="cs-grid cs-grid--copilot">
    <Panel title="Manager chat" eyebrow={state.health?.capabilities?.ai_provider ? 'AI PROVIDER VERIFIED' : 'SAFE LOCAL FALLBACK'} className="cs-chat-panel"><div className="cs-chat-log" aria-live="polite">{messages.map((message, index) => <article className={`cs-chat cs-chat--${message.role}`} key={index}><strong>{message.role === 'manager' ? 'Copilot Manager' : 'You'}</strong><p>{message.text}</p></article>)}</div><form className="cs-chat-form" onSubmit={ask}><textarea aria-label="Message Copilot Manager" value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} /><button className="cs-button--primary" disabled={asking}>{asking ? 'Thinking…' : 'Send'}</button></form></Panel>
    <div className="cs-stack"><Panel title={state.activeTask ? 'Current task plan' : 'Create a task'} eyebrow="TASK PLANNING">{state.activeTask ? <><h3>{state.activeTask.title}</h3><pre>{state.taskDetails?.plans[0]?.content || 'Create the first immutable plan version.'}</pre></> : <NewTaskForm state={state} compact />}</Panel><Panel title="Specialist assignments" eyebrow="DURABLE HANDOFFS">{state.taskDetails?.assignments.length ? <div className="cs-assignment-list">{state.taskDetails.assignments.map(assignment => <div key={assignment.id}><span>{assignment.id}</span><div><strong>{assignment.specialist_id}</strong><small>Plan v{assignment.plan_version} · {assignment.status}</small></div><StatusPill state={assignment.status === 'active' ? 'active' : 'passed'} /></div>)}</div> : <EmptyState title="No specialist assigned" detail="Assignment becomes durable after plan approval." />}</Panel><Panel title="Final-result gate" eyebrow="SERVER ENFORCED"><p className="cs-callout">The frontend cannot set COMPLETED. Approval calls the backend completion service, which rejects the request until every applicable gate passes.</p><TaskActions state={state} /></Panel></div>
  </div></div>
}
