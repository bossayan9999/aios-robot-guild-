import { useState } from 'react'
import type { ReactNode } from 'react'
import type { PlatformState } from './state'
import { ConnectionCard, EmptyState, Panel, StatusPill } from './components'

const legacySpecialists = [
  ['Tech Development', 'Software architecture, implementation and testing', 'TD'],
  ['Business', 'Requirements, operations and value analysis', 'BU'],
  ['Finance Advisory', 'Scenario planning and financial risk explanation', 'FA'],
  ['CCNA Network and Security', 'Network design, simulation and authorized checks', 'CN'],
  ['Cybersecurity', 'Threat modeling and defensive security review', 'CS'],
  ['DevOps', 'CI/CD, infrastructure, reliability and rollback', 'DO'],
  ['Research and OSINT', 'Source-grounded lawful research', 'RO'],
  ['UI/UX', 'Accessible product and interaction design', 'UX'],
]

export function SpecialistTeam({ state }: { state: PlatformState }) {
  const [name, setName] = useState('')
  const assignments = new Map((state.orchestration?.specialist_assignments || []).map(item => [item.specialist_id, item]))
  if (state.specialists.length || state.health?.capabilities?.orchestration) return <ScreenTitle eyebrow="CAPABILITY REGISTRY" title="Specialist Team" detail="Versioned roles receive bounded tasks and least-privileged tools.">
    <div className="cs-specialists">{state.specialists.map(manifest => { const assignment = assignments.get(manifest.id); const evaluation = state.specialistRuntime?.evaluations.find(item => item.specialist_id === manifest.id && item.specialist_version === manifest.version); const grants = state.specialistRuntime?.grants.filter(item => item.specialist_id === manifest.id && item.status === 'ACTIVE').length || 0; return <article key={`${manifest.id}-${manifest.version}`}><div className="cs-monogram">{manifest.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</div><div><h2>{manifest.name} <small>v{manifest.version}</small></h2><p>{manifest.role}</p><small>{manifest.risk_level} risk · {manifest.status} · {evaluation ? `evaluation ${evaluation.status} ${evaluation.score}/100` : 'built-in policy baseline'} · {grants} active grants</small></div><StatusPill state={assignment ? 'active' : manifest.enabled ? 'pending' : 'not_configured'}>{assignment?.status || (manifest.enabled ? 'Standby' : 'Disabled')}</StatusPill></article> })}</div>
    <Panel title="Execution contracts" eyebrow="DENY BY DEFAULT"><p className="cs-callout">A specialist can run only with a current assignment, an active expiring capability grant, and a server-issued execution contract. Contracts prepare bounded work but do not simulate execution or runtime health.</p></Panel>
    <Panel title="Custom specialist builder" eyebrow="SAFE DEFAULT-OFF REGISTRY"><form className="cs-chat-form" onSubmit={event => { event.preventDefault(); if (!name.trim()) return; void state.createCustomSpecialist({ name, role: name, instructions: `Operate only within the approved ${name} assignment scope. Escalate uncertainty and attach evidence.`, input_schema: { type: 'object' }, output_schema: { type: 'object' }, requested_skills: ['evidence-review'], requested_tools: [], requested_connectors: [], requested_runtimes: ['docker-sandbox'], risk_level: 'high', approval_policy: 'sandbox, security, owner', test_cases: [{ name: 'reject scope expansion' }] }); setName('') }}><input aria-label="Custom specialist name" value={name} onChange={event => setName(event.target.value)} placeholder="Specialist name" maxLength={80} /><button className="cs-button--primary" disabled={state.busy || name.trim().length < 3}>Create disabled draft</button></form><p className="cs-callout">Custom specialists are versioned and disabled by default. Sandbox evaluation, security review, and owner approval are required before enablement; revocation remains server controlled.</p></Panel>
  </ScreenTitle>
  return <ScreenTitle eyebrow="CAPABILITY REGISTRY" title="Specialist Team" detail="Versioned roles receive bounded tasks and least-privileged tools.">
    <div className="cs-specialists">{legacySpecialists.map(([name, detail, icon], index) => <article key={name}><div className="cs-monogram">{icon}</div><div><h2>{name}</h2><p>{detail}</p><small>{index < (state.profile?.specialists.length || 0) ? 'Profile available from backend' : 'Available for assignment · no active execution'}</small></div><StatusPill state="pending">Standby</StatusPill></article>)}</div>
    <Panel title="Custom specialist builder" eyebrow="BACKEND TASK"><EmptyState title="Not configured" detail="A specialist manifest registry, evaluation sandbox, and approval API must be implemented before custom specialists can be created." action={<button disabled>Create specialist</button>} /></Panel>
  </ScreenTitle>
}

export function ResearchDevelopment({ state }: { state: PlatformState }) {
  return <ScreenTitle eyebrow="EVIDENCE-LED DISCOVERY" title="Research & Development" detail="Move from sourced questions to reviewed decisions without losing provenance.">
    <div className="cs-rd-flow">{['Sources & citations', 'Hypotheses', 'Experiments', 'Prototypes', 'Findings', 'Decision records'].map((label, index) => <article key={label}><span>{String(index + 1).padStart(2, '0')}</span><h2>{label}</h2><p>{index === 0 && state.taskDetails?.evidence.length ? `${state.taskDetails.evidence.length} task evidence records available` : 'Not configured — backend domain API required'}</p></article>)}</div>
    <Panel title="Research projects" eyebrow="WORKSPACE"><EmptyState title="No research projects" detail="Research project persistence is documented as a backend task. Mission evidence remains available without inventing project records." /></Panel>
  </ScreenTitle>
}

export function DevelopmentStudio({ state }: { state: PlatformState }) {
  const task = state.activeTask
  return <ScreenTitle eyebrow="ENGINEERING WORKSPACE" title="Development Studio" detail="Repository context, restricted terminal state, and verifiable quality evidence.">
    <div className="cs-grid cs-grid--thirds">
      <Panel title="Task workspace" eyebrow="SOURCE"><div className="cs-repo"><span>Backend task</span>{task ? <strong>{task.title}</strong> : <strong>Not selected</strong>}<small>{task ? `${task.workspace_id} · ${task.state}` : 'Repository/file-tree API not configured'}</small></div></Panel>
      <Panel title="Real terminal" eyebrow="LOCAL RESTRICTED AGENT"><div className="cs-state-block"><StatusPill state={state.runtimes[0].state} /><h3>{state.runtimes[0].detail}</h3><p>This is never labeled connected until the loopback companion responds.</p></div></Panel>
      <Panel title="GitHub delivery" eyebrow="BRANCH & PULL REQUEST"><div className="cs-state-block"><StatusPill state={state.releaseStatus?.github_connected ? 'connected' : 'not_configured'} /><h3>{state.releaseStatus?.github_connected ? 'GitHub App verified' : 'Repository automation unavailable'}</h3><p>No branch or pull-request state API is configured.</p></div></Panel>
    </div>
    <Panel title="Builds and tests" eyebrow="COMPLETION EVIDENCE"><div className="cs-gates cs-gates--wide">{state.gates.slice(0, 3).map(gate => <div className="cs-gate" key={gate.id}><span className={`cs-gate__mark cs-gate__mark--${gate.state}`}>{gate.state === 'passed' ? '✓' : '·'}</span><div><strong>{gate.label}</strong><small>{gate.evidence}</small></div><StatusPill state={gate.state} /></div>)}</div></Panel>
    <Panel title="Code workspace" eyebrow="BACKEND TASK"><EmptyState title="Not configured" detail="The restricted repository workspace API and file editor have not been implemented. Use the approved local development workflow." /></Panel>
  </ScreenTitle>
}

export function NetworkCenter() {
  const checks = ['DNS resolution', 'Routing tables', 'VLAN configuration', 'VPN posture', 'Firewall policy']
  return <ScreenTitle eyebrow="READ-ONLY BY DEFAULT" title="Network Center" detail="Approved inventory and bounded CCNA checks—never unverified live access.">
    <div className="cs-grid cs-grid--main"><Panel title="Approved device inventory" eyebrow="AUTHORIZATION"><EmptyState title="No approved devices" detail="Device inventory and authorization APIs are not configured. No network target will be contacted." /></Panel><Panel title="Network health" eyebrow="VERIFIED SIGNALS"><div className="cs-check-list">{checks.map(check => <div key={check}><span className="cs-dot cs-dot--not_configured" /><strong>{check}</strong><StatusPill state="not_configured" /></div>)}</div></Panel></div>
    <Panel title="CCNA findings" eyebrow="SIMULATION & REVIEW"><EmptyState title="No findings recorded" detail="Open Guild View for the existing safe CCNA simulator. Live device execution remains disabled." /></Panel>
  </ScreenTitle>
}

export function Integrations({ state }: { state: PlatformState }) {
  return <ScreenTitle eyebrow="VERIFIED CONNECTION REGISTRY" title="Integrations" detail="A connection is green only after the backend verifies it."><div className="cs-connection-grid">{state.integrations.map(connection => <ConnectionCard connection={connection} key={connection.id} />)}</div><Panel title="Connector backend tasks" eyebrow="HONEST LIMITS"><p className="cs-callout">Implement a tenant-scoped connector registry, credential references, OAuth callbacks, health verification, revocation, and audit events before enabling unconfigured providers.</p></Panel></ScreenTitle>
}

export function RuntimeCenter({ state }: { state: PlatformState }) {
  return <ScreenTitle eyebrow="HYBRID EXECUTION" title="Runtime Center" detail="Every runtime reports a real, verified capability state."><div className="cs-connection-grid">{state.runtimes.map(connection => <ConnectionCard connection={connection} key={connection.id} />)}</div><Panel title="Runtime policy" eyebrow="SANDBOX FIRST"><div className="cs-policy-row"><div><strong>Deny by default</strong><small>Only task-scoped capabilities are granted.</small></div><div><strong>Restricted terminal agents</strong><small>Structured commands, loopback pairing, explicit confirmation.</small></div><div><strong>Remote enrollment</strong><small>Not configured until identity and revocation APIs exist.</small></div></div></Panel></ScreenTitle>
}

export function AuditSecurity({ state }: { state: PlatformState }) {
  return <ScreenTitle eyebrow="CONTROL & ACCOUNTABILITY" title="Audit & Security" detail="Approvals, policy decisions, blocked work and emergency controls.">
    <div className="cs-grid cs-grid--main"><Panel title="Task audit trail" eyebrow="AVAILABLE EVIDENCE">{state.events.length ? <div className="cs-audit-list">{state.events.map(event => <div key={event.id}><time>{new Date(event.created_at).toLocaleString()}</time><div><strong>{event.from_state ? `${event.from_state} → ${event.to_state}` : event.to_state}</strong><p>{event.reason}</p></div></div>)}</div> : <EmptyState title="No task audit events" detail="Select or create a task to see its durable state history." />}</Panel><Panel title="Policy decisions" eyebrow="COMPLETION ENFORCEMENT"><div className="cs-gates">{state.gates.map(gate => <div className="cs-gate" key={gate.id}><div><strong>{gate.label}</strong><small>{gate.evidence}</small></div><StatusPill state={gate.state} /></div>)}</div></Panel></div>
    <div className="cs-grid cs-grid--thirds"><Panel title="Blocked operations" eyebrow="BACKEND TASK"><EmptyState title="No blocked-operation API" detail="A structured policy-decision endpoint is required." /></Panel><Panel title="Device revocation" eyebrow="BACKEND TASK"><EmptyState title="Not configured" detail="No enrolled runtime or mobile device registry exists." /></Panel><Panel title="Emergency stop" eyebrow="SAFETY CONTROL"><div className="cs-danger"><strong>Unavailable</strong><p>No global execution lease or cancellation API exists yet. This control is intentionally disabled.</p><button disabled>Emergency stop</button></div></Panel></div>
  </ScreenTitle>
}

export function Settings({ state }: { state: PlatformState }) {
  return <ScreenTitle eyebrow="WORKSPACE CONTROL" title="Settings" detail="Security-aware preferences and platform configuration.">
    <div className="cs-grid cs-grid--main"><Panel title="Workspace identity" eyebrow="CURRENT SESSION"><div className="cs-state-block"><StatusPill state="connected">Authenticated</StatusPill><h3>{state.auth?.email}</h3><p>Organization and multi-workspace APIs are planned for v0.3.</p></div></Panel><Panel title="Feature controls" eyebrow="DEFAULT OFF"><div className="cs-check-list">{['Custom connectors', 'Remote runtimes', 'Real terminal', 'Controlled learning'].map(item => <div key={item}><span className="cs-dot cs-dot--not_configured" /><strong>{item}</strong><StatusPill state="not_configured" /></div>)}</div></Panel></div>
    <Panel title="Security preferences" eyebrow="POLICY ENFORCED"><p className="cs-callout">Permissions, approvals, network access, secrets, and production security policy cannot be widened automatically. Server-side policy remains authoritative.</p></Panel>
  </ScreenTitle>
}

function ScreenTitle({ eyebrow, title, detail, children }: { eyebrow: string; title: string; detail: string; children: ReactNode }) {
  return <div className="cs-screen"><div className="cs-page-title"><div><p className="cs-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{detail}</p></div></div>{children}</div>
}
