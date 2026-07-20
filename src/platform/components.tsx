import type { ReactNode } from 'react'
import { connectionLabel, type ConnectionRecord, type ConnectionState } from './domain'

export function StatusPill({ state, children }: { state: ConnectionState | 'passed' | 'active' | 'pending' | 'failed'; children?: ReactNode }) {
  return <span className={`cs-status cs-status--${state}`}>{children || connectionLabel(state as ConnectionState)}</span>
}

export function Panel({ title, eyebrow, action, children, className = '' }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`cs-panel ${className}`}>
    <header className="cs-panel__head">
      <div>{eyebrow && <p className="cs-eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>
      {action}
    </header>
    {children}
  </section>
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="cs-empty"><span aria-hidden="true">+</span><strong>{title}</strong><p>{detail}</p>{action}</div>
}

export function ConnectionCard({ connection }: { connection: ConnectionRecord }) {
  return <article className="cs-connection">
    <div className="cs-monogram" aria-hidden="true">{connection.name.split(/\s|\//).map(word => word[0]).join('').slice(0, 2)}</div>
    <div><h3>{connection.name}</h3><p>{connection.detail}</p>{connection.verifiedAt && <small>Verified {new Date(connection.verifiedAt).toLocaleString()}</small>}</div>
    <StatusPill state={connection.state} />
  </article>
}

export function Metric({ label, value, detail, tone = 'neutral' }: { label: string; value: string | number; detail: string; tone?: 'neutral' | 'good' | 'warn' }) {
  return <article className={`cs-metric cs-metric--${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}
