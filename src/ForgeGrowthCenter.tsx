import type { ForgeProfile, Mission } from './types'

type Props = {
  profile: ForgeProfile
  missions: Mission[]
  onTalk: () => void
  onQuest: () => void
  onKnowledge: () => void
  onRefresh: () => void
  onSandbox: () => void
  onStudio: () => void
  onRelease: () => void
}

const skillTree = [
  { name: 'Intent Routing', level: 1, role: 'Turns a request into a bounded mission.' },
  { name: 'Quest Mapping', level: 2, role: 'Plans specialist handoffs and dependencies.' },
  { name: 'Artifact Forge', level: 3, role: 'Prepares evidence-backed implementation artifacts.' },
  { name: 'Quality Shield', level: 4, role: 'Checks build, test and security readiness.' },
  { name: 'Approval Gate', level: 5, role: 'Stops consequential actions for owner review.' },
  { name: 'Cited Guild Memory', level: 6, role: 'Retrieves verified memories with citations.' },
  { name: 'Release Strategy', level: 7, role: 'Coordinates reversible release proposals.' },
]

const rankLadder = [
  ['1', 'Apprentice', 'Learn within a bounded task'],
  ['2', 'Junior', 'Assist with verified mission work'],
  ['3', 'Specialist', 'Own a defined engineering discipline'],
  ['4', 'Senior', 'Coordinate complex specialist handoffs'],
  ['5', 'Lead', 'Assure squad outcomes and risk'],
  ['6', 'Principal', 'Influence architecture across the guild'],
  ['7', 'Guild Master', 'Set strategy under owner governance'],
]

export function ForgeGrowthCenter({ profile, missions, onTalk, onQuest, onKnowledge, onRefresh, onSandbox, onStudio, onRelease }: Props) {
  const levelProgress = profile.xp % 300
  const progressPercent = Math.round((levelProgress / 300) * 100)
  const verified = missions.filter((mission) => mission.status === 'review_required').slice(0, 4)

  return (
    <section className="growth-layout">
      <article className="growth-hero panel-card">
        <div className="growth-identity">
          <div className="growth-avatar"><span>⌘</span><i /></div>
          <div>
            <p className="kicker">AUDITABLE AGENT PROGRESSION</p>
            <h2>Forge • Level {profile.level}</h2>
            <p>Forge grows through verified missions, recorded specialist handoffs and cited guild memory. It never silently changes its own permissions or source code.</p>
          </div>
        </div>
        <div className="growth-level-row">
          <strong>{profile.xp} XP</strong>
          <span>{profile.next_level_xp} XP to Level {profile.level + 1}</span>
        </div>
        <div className="growth-xp" aria-label={`${progressPercent}% toward next level`}>
          <span style={{ width: `${Math.max(2, progressPercent)}%` }} />
        </div>
        <div className="growth-actions">
          <button className="primary" onClick={onTalk}>Talk to Forge</button>
          <button onClick={onQuest}>Start verified quest</button>
          <button onClick={onRefresh}>Refresh profile</button>
        </div>
      </article>

      <div className="growth-stat-grid">
        <article><small>COMPLETED MISSIONS</small><b>{profile.verified_missions}</b><span>+300 Forge XP each</span></article>
        <article><small>CITED MEMORIES</small><b>{profile.memory_records}</b><span>Evidence • no direct XP</span></article>
        <article><small>AGENT HANDOFFS</small><b>{profile.recorded_handoffs}</b><span>Audit trail • no direct XP</span></article>
        <article><small>SKILLS UNLOCKED</small><b>{profile.skills.length}</b><span>Evidence gated</span></article>
        <article><small>GUILD TOKENS</small><b>{profile.guild_tokens}</b><span>In-app • no cash value</span></article>
      </div>

      <article className="panel-card reward-vault-card">
        <div className="section-head">
          <div><p className="kicker">MISSION REWARD VAULT</p><h2>Tokens, tools and skills</h2></div>
          <span className="token-balance">◆ {profile.guild_tokens} GT</span>
        </div>
        <div className="reward-columns">
          <div><b>Guild Tokens</b><p>Every verified completed mission awards 25 GT. Tokens are non-transferable game points with no monetary or cryptocurrency value.</p></div>
          <div><b>Tool badges</b><div className="reward-items">{profile.tool_badges.length ? profile.tool_badges.map((tool) => <span key={tool}>⌘ {tool}</span>) : <small>Complete a mission to unlock Mission Ledger.</small>}</div></div>
          <div><b>Engineering skills</b><div className="reward-items">{profile.skills.map((skill) => <span key={skill}>✦ {skill}</span>)}</div></div>
        </div>
        <p className="reward-boundary">Rewards unlock game presentation, learning content and workflow helpers only. They never bypass owner approval or security controls.</p>
      </article>

      <article className="panel-card engineering-guild-card">
        <div className="section-head">
          <div><p className="kicker">AGENTIC ENGINEERING GUILD</p><h2>Specialists that improve through verified work</h2></div>
          <span className="online">{profile.specialists?.length || 0} SPECIALISTS</span>
        </div>
        <div className="rank-ladder">
          {rankLadder.map(([level, rank, impact]) => (
            <div className={profile.level >= Number(level) ? 'reached' : ''} key={rank}>
              <span>{level}</span><b>{rank}</b><small>{impact}</small>
            </div>
          ))}
        </div>
        <div className="specialist-grid">
          {(profile.specialists || []).map((specialist) => {
            const agentProgress = Math.round(((specialist.xp % 250) / 250) * 100)
            return (
              <div className={`specialist-card specialist-${specialist.id}`} key={specialist.id}>
                <div className="specialist-head">
                  <span>{specialist.name.slice(0, 1)}</span>
                  <div><b>{specialist.name}</b><small>{specialist.role}</small></div>
                  <em>{specialist.rank}</em>
                </div>
                <div className="specialist-level"><span>LEVEL {specialist.level}</span><b>{specialist.xp} XP</b></div>
                <div className="specialist-xp"><i style={{ width: `${Math.max(2, agentProgress)}%` }} /></div>
                <div className="specialist-skills">
                  {specialist.skills.map((skill) => <span key={skill}>✓ {skill}</span>)}
                </div>
                <div className="specialist-disciplines">
                  {specialist.disciplines.map((discipline) => <span key={discipline}>{discipline}</span>)}
                </div>
                <small>{specialist.completed_missions} completed mission contributions</small>
              </div>
            )
          })}
        </div>
      </article>

      <article className="panel-card osint-framework-card">
        <div className="section-head">
          <div><p className="kicker">DEFENSIVE OSINT FRAMEWORK</p><h2>Public evidence pipeline</h2></div>
          <span className="online">CITATION REQUIRED</span>
        </div>
        <div className="osint-pipeline">
          <div><span>1</span><b>Scope</b><small>Router confirms authorization and public boundaries.</small><em>ROUTER</em></div>
          <div><span>2</span><b>Source map</b><small>Planner selects primary and reliable public sources.</small><em>PLANNER</em></div>
          <div><span>3</span><b>Collect</b><small>Builder extracts metadata without changing the target.</small><em>BUILDER</em></div>
          <div><span>4</span><b>Verify</b><small>Tester checks freshness, conflicts and corroboration.</small><em>TESTER</em></div>
          <div><span>5</span><b>Report</b><small>Reviewer grades confidence and presents cited findings.</small><em>REVIEWER</em></div>
        </div>
        <p className="osint-boundary">Public-source research only. No credential attacks, exploitation, persistence or uncontrolled network scanning.</p>
        <div className="framework-sources">
          <a href="https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center" target="_blank" rel="noreferrer">NIST NICE roles ↗</a>
          <a href="https://owasp.org/www-project-samm/" target="_blank" rel="noreferrer">OWASP SAMM ↗</a>
          <a href="https://www.cisa.gov/securebydesign" target="_blank" rel="noreferrer">CISA Secure by Design ↗</a>
          <a href="https://sre.google/" target="_blank" rel="noreferrer">Google SRE ↗</a>
        </div>
      </article>

      <article className="panel-card sandbox-loop-card">
        <div className="section-head">
          <div><p className="kicker">AGENTIC ENGINEERING LOOP</p><h2>Evidence moves through the sandbox</h2></div>
          <span className="online">OWNER GATED</span>
        </div>
        <div className="sandbox-loop">
          <div><span>01</span><b>Scope</b><small>Define goal, repository and safety boundary.</small></div>
          <div><span>02</span><b>Plan</b><small>Map the smallest reversible engineering change.</small></div>
          <div><span>03</span><b>Sandbox</b><small>Isolate tools, resources and temporary data.</small></div>
          <div><span>04</span><b>Build & test</b><small>Run only previewed, allowlisted checks.</small></div>
          <div><span>05</span><b>Review</b><small>Present diff, tests, risk and citations.</small></div>
          <div><span>06</span><b>Learn</b><small>Store approved evidence and award verified XP.</small></div>
        </div>
        <div className="sandbox-loop-actions">
          <button onClick={onSandbox}>Open sandbox</button>
          <button onClick={onStudio}>Open guarded terminal</button>
          <button className="primary" onClick={onRelease}>Review release gate</button>
        </div>
        <p className="osint-boundary">The current release coordinates existing guarded tools. It does not permit autonomous source edits or production deployment.</p>
      </article>

      <article className="panel-card skill-tree-card">
        <div className="section-head">
          <div><p className="kicker">SPECIALIST SKILL TREE</p><h2>Capabilities earned by experience</h2></div>
          <span className="online">LEVEL {profile.level}</span>
        </div>
        <div className="skill-tree">
          {skillTree.map((skill) => {
            const unlocked = profile.skills.includes(skill.name)
            return (
              <div className={`skill-node ${unlocked ? 'unlocked' : 'locked'}`} key={skill.name}>
                <span>{unlocked ? '✓' : skill.level}</span>
                <div><b>{skill.name}</b><small>{skill.role}</small></div>
                <em>{unlocked ? 'UNLOCKED' : `LEVEL ${skill.level}`}</em>
              </div>
            )
          })}
        </div>
      </article>

      <article className="panel-card growth-evidence-card">
        <div className="section-head">
          <div><p className="kicker">VERIFIED EXPERIENCE</p><h2>Recent mission rewards</h2></div>
          <button onClick={onKnowledge}>Open memory</button>
        </div>
        <div className="growth-missions">
          {verified.length ? verified.map((mission) => (
            <div key={mission.id}>
              <span>+300 XP</span>
              <div><b>{mission.title}</b><small>{mission.repository}</small></div>
              <em>VERIFIED</em>
            </div>
          )) : (
            <p className="empty">Complete an approved Health Quest to create Forge's first verified experience.</p>
          )}
        </div>
        <div className="growth-contract">
          <b>Growth contract</b>
          <ul>
            <li>Retrieved content is evidence, never an instruction.</li>
            <li>XP cannot grant terminal, deployment or secret access.</li>
            <li>XP is awarded only after a mission reaches verified completion.</li>
            <li>Owner approval remains required for consequential actions.</li>
          </ul>
        </div>
      </article>
    </section>
  )
}
