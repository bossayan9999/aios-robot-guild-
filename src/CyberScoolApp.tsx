import { lazy, Suspense, useEffect, useState } from 'react'
import { platformNavigation, routeFromHash, type PlatformRoute } from './platform/navigation'
import { usePlatformState } from './platform/state'
import { CopilotManager, MissionControl } from './platform/MissionScreens'
import { AuditSecurity, DevelopmentStudio, Integrations, NetworkCenter, ResearchDevelopment, RuntimeCenter, Settings, SpecialistTeam } from './platform/ProductScreens'
import './platform.css'

const GuildApplication = lazy(() => import('./App').then(module => ({ default: module.App })))

export function CyberScoolApp() {
  const [route, setRoute] = useState<PlatformRoute>(() => routeFromHash(location.hash))
  const state = usePlatformState()
  useEffect(() => {
    const update = () => setRoute(routeFromHash(location.hash))
    addEventListener('hashchange', update); return () => removeEventListener('hashchange', update)
  }, [])
  function navigate(next: PlatformRoute) { location.hash = `/${next}`; setRoute(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  if (route === 'guild-view') return <div className="cs-guild-page"><button className="cs-guild-back" onClick={() => navigate('mission-control')}>← CyberScool dashboard</button><Suspense fallback={<Loading label="Loading Guild View" />}><GuildApplication /></Suspense></div>
  if (state.loading) return <Loading label="Connecting to CyberScool control plane" />
  if (!state.auth?.authenticated) return <AuthScreen state={state} />

  return <div className="cs-shell">
    <aside className="cs-sidebar">
      <button className="cs-brand" onClick={() => navigate('mission-control')}><span>C</span><div><strong>CyberScool</strong><small>Agentic operations</small></div></button>
      <nav aria-label="Primary navigation">{platformNavigation.map(item => <button key={item.id} className={route === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={route === item.id ? 'page' : undefined}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.description}</small></div></button>)}</nav>
      <div className="cs-sidebar__footer"><span className={state.health?.ok ? 'is-live' : ''} /><div><strong>{state.health?.ok ? 'Systems operational' : 'Backend unavailable'}</strong><small>{state.auth.email}</small></div></div>
    </aside>
    <main className="cs-main">
      <header className="cs-topbar"><div><span className="cs-breadcrumb">Workspace / {platformNavigation.find(item => item.id === route)?.label}</span></div><div className="cs-topbar__actions">{state.error && <span className="cs-inline-error" role="alert">{state.error}</span>}<button onClick={() => void state.refresh()} aria-label="Refresh platform state">Refresh</button><button onClick={() => void state.logout()}>Sign out</button><span className="cs-user">{state.auth.email?.slice(0, 1).toUpperCase()}</span></div></header>
      {route === 'mission-control' && <MissionControl state={state} navigate={navigate} />}
      {route === 'copilot-manager' && <CopilotManager state={state} />}
      {route === 'specialist-team' && <SpecialistTeam state={state} />}
      {route === 'research-development' && <ResearchDevelopment state={state} />}
      {route === 'development-studio' && <DevelopmentStudio state={state} />}
      {route === 'network-center' && <NetworkCenter />}
      {route === 'integrations' && <Integrations state={state} />}
      {route === 'runtime-center' && <RuntimeCenter state={state} />}
      {route === 'audit-security' && <AuditSecurity state={state} />}
      {route === 'settings' && <Settings state={state} />}
    </main>
    <nav className="cs-mobile-nav" aria-label="Mobile navigation">{platformNavigation.slice(0, 5).map(item => <button key={item.id} className={route === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)}><span>{item.icon}</span>{item.shortLabel}</button>)}</nav>
    <div className="cs-mobile-controls"><button disabled title="Pause API not configured">Pause</button><button disabled title="Emergency stop API not configured">Stop</button></div>
  </div>
}

function Loading({ label }: { label: string }) { return <div className="cs-loading"><span /><strong>{label}</strong><small>Verifying backend state…</small></div> }

function AuthScreen({ state }: { state: ReturnType<typeof usePlatformState> }) {
  const setup = Boolean(state.auth?.setup_required)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  return <main className="cs-auth"><section><div className="cs-auth__brand"><span>C</span><div><strong>CyberScool</strong><small>Secure agentic operations</small></div></div><p className="cs-eyebrow">{setup ? 'OWNER SETUP' : 'SECURE SIGN IN'}</p><h1>{setup ? 'Create the workspace owner' : 'Welcome back'}</h1><p>{setup ? 'Your local control plane is ready. Create the owner account to begin.' : 'Sign in to access missions, approvals, evidence and runtimes.'}</p><form onSubmit={event => { event.preventDefault(); void state.authenticate(setup ? 'setup' : 'login', email, password) }}><label>Email<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete={setup ? 'new-password' : 'current-password'} minLength={12} value={password} onChange={event => setPassword(event.target.value)} required /></label>{state.error && <p className="cs-form-error" role="alert">{state.error}</p>}<button className="cs-button--primary" disabled={state.busy}>{state.busy ? 'Verifying…' : setup ? 'Create secure workspace' : 'Sign in'}</button></form></section><aside><p className="cs-eyebrow">CONTROL BY DESIGN</p><h2>Evidence before completion.</h2><ul><li>Approval-gated task execution</li><li>Restricted local and cloud runtimes</li><li>Durable specialist handoffs</li><li>No unverified connector claims</li></ul></aside></main>
}
