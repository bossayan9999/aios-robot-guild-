import type { CSSProperties, ReactNode } from 'react'
import type { Agent, AgentId, Mission, MissionEvent } from './types'

type CommandTab = 'quest' | 'missions' | 'studio' | 'devices' | 'network' | 'lab' | 'ops' | 'updates' | 'knowledge'

interface GuildCommandCenterProps {
  agents: Agent[]
  activeAgent: AgentId | null
  progress: number
  xp: number
  level: number
  xpInLevel: number
  mission: Mission | null
  events: MissionEvent[]
  backendOnline: boolean
  demoMode: boolean
  factory: ReactNode
  onSelectAgent: (id: AgentId) => void
  onNavigate: (tab: CommandTab) => void
}

const operations: { tab: CommandTab; icon: string; title: string; note: string }[] = [
  { tab: 'quest', icon: '◈', title: 'OSINT Quest', note: 'Inspect public repository evidence' },
  { tab: 'studio', icon: '⌘', title: 'Developer Studio', note: 'Forge, terminal and build tools' },
  { tab: 'network', icon: '⌁', title: 'Network Guild', note: 'CCNA simulator and subnet forge' },
  { tab: 'lab', icon: '⬡', title: 'Security Range', note: 'Authorized defensive sandbox' },
  { tab: 'knowledge', icon: '◇', title: 'Guild Memory', note: 'Search cited verified evidence' },
  { tab: 'updates', icon: '↻', title: 'Release Gate', note: 'Plan owner-approved upgrades' },
]

function stageState(progress: number, index: number, active: boolean) {
  if (active && progress < 100) return 'active'
  if (progress >= (index + 1) * 20) return 'passed'
  return 'queued'
}

export function GuildCommandCenter(props: GuildCommandCenterProps) {
  const status = props.mission?.status.replaceAll('_', ' ') || 'ready for a new quest'
  const evidenceCount = props.events.filter(event => Boolean(event.evidence)).length
  const active = props.agents.find(agent => agent.id === props.activeAgent) || props.agents[0]

  return <section className="guild-command-center">
    <article className="command-banner">
      <div>
        <p className="kicker">GUILD OPERATIONS • OWNER CONTROLLED</p>
        <h2>Agentic Command Deck</h2>
        <p>Turn a goal into a scoped quest, watch specialist robots exchange work, and keep every consequential action behind your approval.</p>
      </div>
      <div className="command-banner-actions">
        <span className={props.backendOnline ? 'command-signal online-signal' : 'command-signal warning-signal'}><i />{props.demoMode ? 'DEMO REALM' : props.backendOnline ? 'BACKEND LINKED' : 'CHECK BACKEND'}</span>
        <button onClick={() => props.onNavigate('missions')}>Mission archive</button>
        <button className="primary" onClick={() => props.onNavigate('quest')}>{props.mission ? 'Open active quest' : 'Create a quest'}</button>
      </div>
    </article>

    <div className="command-metrics" aria-label="Guild status">
      <article><span>GUILD RANK</span><b>LEVEL {props.level}</b><small>{props.xp.toLocaleString()} total XP</small></article>
      <article><span>MISSION STATE</span><b>{status.toUpperCase()}</b><small>{props.progress}% verified progress</small></article>
      <article><span>ACTIVE SPECIALIST</span><b>{active.name.toUpperCase()}</b><small>{active.skill}</small></article>
      <article><span>EVIDENCE VAULT</span><b>{evidenceCount} VERIFIED</b><small>{props.events.length} recorded handoffs</small></article>
    </div>

    <div className="command-main-grid">
      <article className="command-factory panel-card">
        <div className="command-card-head">
          <div><p className="kicker">LIVE GUILD DISTRICT</p><h2>Robot task arena</h2></div>
          <div className="mission-progress-orb"><span>{props.progress}%</span></div>
        </div>
        <div className="factory-frame">
          {props.factory}
          <div className="factory-hud"><span>● REAL-TIME PARTY VIEW</span><span>{active.name} • {stageState(props.progress, props.agents.findIndex(agent => agent.id === active.id), true).toUpperCase()}</span></div>
        </div>
        <div className="command-progress"><span style={{ width: `${props.progress}%` }} /></div>
        <div className="agent-handoff" aria-label="Agent pipeline">
          {props.agents.map((agent, index) => {
            const state = stageState(props.progress, index, props.activeAgent === agent.id)
            return <button key={agent.id} className={`agent-node ${state}`} onClick={() => props.onSelectAgent(agent.id)} style={{ '--agent-color': agent.color } as CSSProperties}>
              <i>{agent.icon}</i><span><b>{agent.name}</b><small>{agent.skill}</small></span><em>{state}</em>
            </button>
          })}
        </div>
      </article>

      <aside className="mission-intel panel-card">
        <div className="command-card-head"><div><p className="kicker">MISSION INTELLIGENCE</p><h2>{props.mission?.title || 'Repository Health Quest'}</h2></div><span className="intel-status">{status}</span></div>
        <p className="mission-repository">{props.mission?.repository || 'Choose a public repository and define the evidence you need.'}</p>
        <div className="mission-objective"><span>PRIMARY OBJECTIVE</span><p>{props.mission?.plan?.split('\n')[0] || 'Create a safe read-only plan and stop at the human approval gate.'}</p></div>
        <div className="intel-feed">
          <p className="kicker">LATEST HANDOFFS</p>
          {props.events.length ? props.events.slice(-4).reverse().map((event, index) => <div key={`${event.agent}-${event.event_type}-${index}`}>
            <i>{props.agents.find(agent => agent.id === event.agent)?.icon}</i><span><b>{event.agent} • {event.event_type.replaceAll('_', ' ')}</b><small>{event.message}</small></span><em>{event.progress}%</em>
          </div>) : <div className="intel-empty"><i>◇</i><span><b>Awaiting mission telemetry</b><small>Create or open a quest to begin the specialist handoff.</small></span></div>}
        </div>
        <div className="intel-actions"><button onClick={() => props.onNavigate('knowledge')}>Search evidence</button><button className="primary" onClick={() => props.onNavigate('quest')}>Mission control →</button></div>
      </aside>
    </div>

    <div className="command-lower-grid">
      <article className="panel-card operation-launcher"><div className="command-card-head"><div><p className="kicker">QUICK DEPLOY</p><h2>Operations map</h2></div><button onClick={() => props.onNavigate('ops')}>System health</button></div><div className="operation-grid">{operations.map(operation => <button key={operation.tab} onClick={() => props.onNavigate(operation.tab)}><i>{operation.icon}</i><span><b>{operation.title}</b><small>{operation.note}</small></span><em>OPEN</em></button>)}</div></article>
      <article className="panel-card progression-card"><p className="kicker">CHARACTER PROGRESSION</p><div className="rank-row"><div className="rank-badge">{props.level}</div><div><h2>Guild Level {props.level}</h2><p>{250 - props.xpInLevel} XP until the next skill tier</p></div></div><div className="xp-track"><span style={{ width: `${props.xpInLevel / 2.5}%` }} /></div><div className="skill-roster">{props.agents.map((agent, index) => <div key={agent.id} className={props.level > index ? 'unlocked' : ''}><i style={{ color: agent.color }}>{agent.icon}</i><span><b>{agent.skill}</b><small>{props.level > index ? 'UNLOCKED' : `LEVEL ${index + 1}`}</small></span></div>)}</div></article>
    </div>
  </section>
}
