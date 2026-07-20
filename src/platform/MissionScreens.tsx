import { useState } from 'react'
import type { FormEvent } from 'react'
import type { PlatformState } from './state'
import { EmptyState, Metric, Panel, StatusPill } from './components'

const specialistMap: Record<string, string> = {
  router: 'Copilot Manager', planner: 'Tech Development', builder: 'Tech Development', tester: 'Cybersecurity', reviewer: 'UI/UX & Security Review',
}

function TaskActions({ state }: { state: PlatformState }) {
  const mission = state.activeMission
  if (!mission) return null
  if (mission.status === 'awaiting_approval') return <div className="cs-actions"><button disabled={state.busy} onClick={() => void state.approveMission('rejected')}>Reject</button><button className="cs-button--primary" disabled={state.busy} onClick={() => void state.approveMission('approved')}>Approve read-only plan</button></div>
  if (mission.status === 'approved') return <button className="cs-button--primary" disabled={state.busy} onClick={() => void state.runMission()}>Run validation</button>
  if (mission.status === 'review_required') return <div className="cs-actions"><button disabled={state.busy} onClick={() => void state.verifyMission('revision_requested')}>Request revision</button><button className="cs-button--primary" disabled={state.busy} onClick={() => void state.verifyMission('completed')}>Approve completed result</button></div>
  if (mission.status === 'completed') return <StatusPill state="passed">Verified complete</StatusPill>
  return <StatusPill state={mission.status === 'failed' ? 'failed' : 'active'}>{mission.status.replaceAll('_', ' ')}</StatusPill>
}

export function NewTaskForm({ state, compact = false }: { state: PlatformState; compact?: boolean }) {
  const [title, setTitle] = useState('Inspect repository health and collect evidence')
  const [repository, setRepository] = useState('https://github.com/bossayan9999/aios-robot-guild-')
  function submit(event: FormEvent) { event.preventDefault(); void state.createMission(title, repository) }
  return <form className={`cs-task-form ${compact ? 'cs-task-form--compact' : ''}`} onSubmit={submit}>
    <label>Objective<input value={title} onChange={event => setTitle(event.target.value)} minLength={3} maxLength={180} required /></label>
    <label>Public GitHub repository<input value={repository} onChange={event => setRepository(event.target.value)} type="url" required /></label>
    <button className="cs-button--primary" disabled={state.busy}>{state.busy ? 'Working…' : 'Create approval-gated task'}</button>
  </form>
}

export function MissionControl({ state, navigate }: { state: PlatformState; navigate: (route: 'copilot-manager' | 'integrations' | 'runtime-center') => void }) {
  const passed = state.gates.filter(gate => gate.state === 'passed').length
  const approvals = state.activeMission && ['awaiting_approval', 'review_required'].includes(state.activeMission.status) ? 1 : 0
  const evidence = state.events.length
  return <div className="cs-screen">
    <section className="cs-hero">
      <div><p className="cs-eyebrow">CYBERSCOOL CONTROL PLANE</p><h1>Verified work, under your control.</h1><p>Secure research, development and automation across local and cloud runtimes—with every decision, handoff and result made visible.</p></div>
      <div className="cs-hero__health"><span className={state.health?.ok ? 'is-live' : ''} /><div><strong>{state.health?.ok ? 'Control plane operational' : 'Control plane unavailable'}</strong><small>{state.health ? `Build ${state.health.build} · checked ${new Date(state.health.checked_at).toLocaleTimeString()}` : 'Waiting for backend health'}</small></div></div>
    </section>
    <div className="cs-metrics">
      <Metric label="Active tasks" value={state.missions.filter(mission => mission.status !== 'completed').length} detail={`${state.missions.length} total recorded`} />
      <Metric label="Completion gates" value={`${passed}/7`} detail="All required before completion" tone={passed === 7 ? 'good' : 'neutral'} />
      <Metric label="Approvals" value={approvals} detail={approvals ? 'Owner action required' : 'No pending decision'} tone={approvals ? 'warn' : 'good'} />
      <Metric label="Evidence" value={evidence} detail="Recorded task events" />
    </div>
    <div className="cs-grid cs-grid--main">
      <Panel title="Active task" eyebrow="MISSION STATE" action={<TaskActions state={state} />}>
        {state.activeMission ? <div className="cs-task-summary">
          <div className="cs-task-summary__title"><div><h3>{state.activeMission.title}</h3><a href={state.activeMission.repository} target="_blank" rel="noreferrer">{state.activeMission.repository}</a></div><StatusPill state={state.activeMission.status === 'completed' ? 'passed' : state.activeMission.status === 'failed' ? 'failed' : 'active'}>{state.activeMission.status.replaceAll('_', ' ')}</StatusPill></div>
          <pre>{state.activeMission.plan}</pre>
        </div> : <EmptyState title="No task selected" detail="Create the first approval-gated task with Copilot Manager." action={<button className="cs-button--primary" onClick={() => navigate('copilot-manager')}>Open Copilot Manager</button>} />}
      </Panel>
      <Panel title="Completion gates" eyebrow="AUTHORITATIVE STATUS">
        <div className="cs-gates">{state.gates.map(gate => <div className="cs-gate" key={gate.id}><span className={`cs-gate__mark cs-gate__mark--${gate.state}`}>{gate.state === 'passed' ? '✓' : gate.state === 'failed' ? '!' : '·'}</span><div><strong>{gate.label}</strong><small>{gate.evidence}</small></div><StatusPill state={gate.state} /></div>)}</div>
      </Panel>
      <Panel title="Evidence timeline" eyebrow="RECORDED HANDOFFS">
        {state.events.length ? <div className="cs-timeline">{state.events.map((event, index) => <article key={event.id || `${event.event_type}-${index}`}><span>{event.progress}%</span><div><strong>{specialistMap[event.agent] || event.agent}</strong><p>{event.message}</p><small>{event.created_at ? new Date(event.created_at).toLocaleString() : event.event_type.replaceAll('_', ' ')}</small></div></article>)}</div> : <EmptyState title="No evidence yet" detail="Evidence appears after a planned task advances through approved execution." />}
      </Panel>
      <Panel title="Runtime health" eyebrow="VERIFIED CONNECTIONS" action={<button onClick={() => navigate('runtime-center')}>View runtimes</button>}>
        <div className="cs-compact-list">{state.runtimes.slice(0, 3).map(runtime => <div key={runtime.id}><span className={`cs-dot cs-dot--${runtime.state}`} /><div><strong>{runtime.name}</strong><small>{runtime.detail}</small></div><StatusPill state={runtime.state} /></div>)}</div>
      </Panel>
    </div>
  </div>
}

export function CopilotManager({ state }: { state: PlatformState }) {
  const [question, setQuestion] = useState('What is the safest next step for this task?')
  const [messages, setMessages] = useState<{ role: 'manager' | 'user'; text: string }[]>([{ role: 'manager', text: 'I coordinate plans and specialist handoffs. I will request approval before execution and will not claim completion without evidence.' }])
  const [asking, setAsking] = useState(false)
  async function ask(event: FormEvent) {
    event.preventDefault(); if (!question.trim()) return
    const next = question.trim(); setMessages(current => [...current, { role: 'user', text: next }]); setQuestion(''); setAsking(true)
    try { const result = await state.askCopilot(next); setMessages(current => [...current, { role: 'manager', text: result.answer }]) }
    catch (problem) { setMessages(current => [...current, { role: 'manager', text: problem instanceof Error ? problem.message : 'Copilot is unavailable.' }]) }
    finally { setAsking(false) }
  }
  return <div className="cs-screen"><div className="cs-page-title"><div><p className="cs-eyebrow">ORCHESTRATION</p><h1>Copilot Manager</h1><p>Plan work, assign specialists, and advance only through verified gates.</p></div><TaskActions state={state} /></div>
    <div className="cs-grid cs-grid--copilot">
      <Panel title="Manager chat" eyebrow={state.health?.capabilities?.ai_provider ? 'AI PROVIDER VERIFIED' : 'SAFE LOCAL FALLBACK'} className="cs-chat-panel">
        <div className="cs-chat-log" aria-live="polite">{messages.map((message, index) => <article className={`cs-chat cs-chat--${message.role}`} key={index}><strong>{message.role === 'manager' ? 'Copilot Manager' : 'You'}</strong><p>{message.text}</p></article>)}</div>
        <form className="cs-chat-form" onSubmit={ask}><textarea aria-label="Message Copilot Manager" value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} /><button className="cs-button--primary" disabled={asking}>{asking ? 'Thinking…' : 'Send'}</button></form>
      </Panel>
      <div className="cs-stack">
        <Panel title={state.activeMission ? 'Current task plan' : 'Create a task'} eyebrow="TASK PLANNING">{state.activeMission ? <><h3>{state.activeMission.title}</h3><pre>{state.activeMission.plan}</pre></> : <NewTaskForm state={state} compact />}</Panel>
        <Panel title="Specialist assignment" eyebrow="BOUNDED HANDOFFS"><div className="cs-assignment-list">{['Copilot Manager', 'Tech Development', 'Cybersecurity', 'Reviewer'].map((name, index) => <div key={name}><span>{index + 1}</span><div><strong>{name}</strong><small>{index < state.events.length ? 'Handoff recorded' : index === state.events.length ? 'Current assignment' : 'Pending'}</small></div><StatusPill state={index < state.events.length ? 'passed' : index === state.events.length ? 'active' : 'pending'} /></div>)}</div></Panel>
        <Panel title="Final-result gate" eyebrow="OWNER CONTROL"><p className="cs-callout">Completion stays locked until implementation, tests, validation, specialist review, security review, evidence, and required approvals pass.</p><TaskActions state={state} /></Panel>
      </div>
    </div>
  </div>
}
