import { useMemo, useState } from 'react'

type NodeId = 'internet' | 'edge' | 'core' | 'access1' | 'access2' | 'server' | 'pc1' | 'pc2'
type NetworkNode = { id: NodeId; name: string; kind: string; ip: string; x: number; y: number; status: 'online' | 'warning' }

const nodes: NetworkNode[] = [
  { id: 'internet', name: 'ISP Cloud', kind: 'WAN', ip: '203.0.113.1/30', x: 50, y: 8, status: 'online' },
  { id: 'edge', name: 'Edge Router', kind: 'Router', ip: '10.10.0.1/30', x: 50, y: 26, status: 'online' },
  { id: 'core', name: 'Core Switch', kind: 'Layer 3 Switch', ip: '10.10.10.1/24', x: 50, y: 48, status: 'online' },
  { id: 'access1', name: 'Access SW-1', kind: 'Layer 2 Switch', ip: '10.10.10.2/24', x: 25, y: 68, status: 'online' },
  { id: 'access2', name: 'Access SW-2', kind: 'Layer 2 Switch', ip: '10.10.10.3/24', x: 75, y: 68, status: 'online' },
  { id: 'server', name: 'Guild Server', kind: 'Server VLAN 30', ip: '10.30.0.10/24', x: 50, y: 88, status: 'online' },
  { id: 'pc1', name: 'Developer PC', kind: 'User VLAN 10', ip: '10.10.10.21/24', x: 14, y: 88, status: 'online' },
  { id: 'pc2', name: 'Lab PC', kind: 'Lab VLAN 20', ip: '10.20.0.21/24', x: 86, y: 88, status: 'warning' },
]

const links: [NodeId, NodeId][] = [['internet', 'edge'], ['edge', 'core'], ['core', 'access1'], ['core', 'access2'], ['core', 'server'], ['access1', 'pc1'], ['access2', 'pc2']]
const nodeById = Object.fromEntries(nodes.map(node => [node.id, node])) as Record<NodeId, NetworkNode>

const lessons = [
  { title: 'VLAN Guild', detail: 'Assign VLANs 10, 20 and 30, then verify trunk links.', xp: 75 },
  { title: 'Subnet Forge', detail: 'Calculate usable hosts and network boundaries.', xp: 60 },
  { title: 'Routing Quest', detail: 'Trace the default route from LAN to the ISP edge.', xp: 90 },
  { title: 'Troubleshooting Raid', detail: 'Find the warning device using show commands.', xp: 120 },
]

function ipv4ToNumber(ip: string) { const parts = ip.trim().split('.').map(Number); if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) throw new Error('Enter a valid IPv4 address'); return parts.reduce((value, part) => ((value << 8) | part) >>> 0, 0) }
function numberToIpv4(value: number) { return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.') }

export function CCNANetworkLab({ onEarnXp }: { onEarnXp: (amount: number) => void }) {
  const [selected, setSelected] = useState<NetworkNode>(nodes[2])
  const [address, setAddress] = useState('192.168.10.34')
  const [prefix, setPrefix] = useState(27)
  const [completed, setCompleted] = useState<string[]>([])
  const [consoleText, setConsoleText] = useState('Select a device to inspect its simulated running state.')

  const subnet = useMemo(() => {
    try {
      const ip = ipv4ToNumber(address), bits = Math.min(32, Math.max(0, prefix)), mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
      const network = (ip & mask) >>> 0, broadcast = (network | (~mask >>> 0)) >>> 0
      const total = 2 ** (32 - bits), usable = bits >= 31 ? (bits === 31 ? 2 : 1) : Math.max(0, total - 2)
      return { network: `${numberToIpv4(network)}/${bits}`, mask: numberToIpv4(mask), first: numberToIpv4(bits >= 31 ? network : network + 1), last: numberToIpv4(bits >= 31 ? broadcast : broadcast - 1), broadcast: numberToIpv4(broadcast), usable, error: '' }
    } catch (error) { return { network: '—', mask: '—', first: '—', last: '—', broadcast: '—', usable: 0, error: error instanceof Error ? error.message : 'Invalid address' } }
  }, [address, prefix])

  function inspect(node: NetworkNode) {
    setSelected(node)
    setConsoleText(`${node.name}\nRole: ${node.kind}\nManagement IP: ${node.ip}\nLink state: ${node.status === 'online' ? 'up/up' : 'investigation required'}\n\nSimulation only — no real device was contacted.`)
  }
  function completeLesson(title: string, reward: number) {
    if (completed.includes(title)) return
    setCompleted(current => [...current, title]); onEarnXp(reward)
  }

  return <section className="ccna-layout">
    <article className="panel-card topology-card">
      <div className="section-head"><div><p className="kicker">CCNA NETWORK OPERATIONS</p><h2>Guild Network Topology</h2></div><span className="safe-sim">● SAFE SIMULATION</span></div>
      <p className="muted">Learn switching, routing, VLANs, IPv4 subnetting and troubleshooting without touching a production network.</p>
      <div className="network-map">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{links.map(([from, to]) => <line key={`${from}-${to}`} x1={nodeById[from].x} y1={nodeById[from].y} x2={nodeById[to].x} y2={nodeById[to].y} />)}</svg>
        {nodes.map(node => <button key={node.id} className={`network-node ${node.status} ${selected.id === node.id ? 'selected' : ''}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => inspect(node)}><i>{node.kind.includes('Switch') ? '▦' : node.kind === 'Router' ? '↔' : node.kind === 'WAN' ? '☁' : '▣'}</i><b>{node.name}</b><small>{node.ip}</small></button>)}
      </div>
      <div className="network-console"><div><span className={selected.status}>●</span><b>{selected.name}</b><small>{selected.kind}</small></div><pre>{consoleText}</pre></div>
    </article>

    <aside>
      <article className="panel-card"><p className="kicker">SUBNET FORGE</p><h2>IPv4 calculator</h2><div className="subnet-inputs"><label>IPv4 address<input value={address} onChange={event => setAddress(event.target.value)} inputMode="decimal" /></label><label>Prefix<select value={prefix} onChange={event => setPrefix(Number(event.target.value))}>{Array.from({ length: 33 }, (_, value) => <option key={value} value={value}>/{value}</option>)}</select></label></div>{subnet.error ? <p className="error">{subnet.error}</p> : <div className="subnet-results"><span><small>Network</small><b>{subnet.network}</b></span><span><small>Mask</small><b>{subnet.mask}</b></span><span><small>Usable range</small><b>{subnet.first} – {subnet.last}</b></span><span><small>Broadcast</small><b>{subnet.broadcast}</b></span><span><small>Usable hosts</small><b>{subnet.usable.toLocaleString()}</b></span></div>}</article>
      <article className="panel-card"><p className="kicker">CERTIFICATION QUESTS</p><h2>Earn Network XP</h2><div className="network-lessons">{lessons.map(lesson => <button key={lesson.title} disabled={completed.includes(lesson.title)} onClick={() => completeLesson(lesson.title, lesson.xp)}><span><b>{completed.includes(lesson.title) ? '✓ ' : ''}{lesson.title}</b><small>{lesson.detail}</small></span><em>+{lesson.xp} XP</em></button>)}</div></article>
      <article className="panel-card"><p className="kicker">COMMAND DECK</p><h2>Safe reference</h2><div className="command-chips">{['show ip interface brief', 'show vlan brief', 'show interfaces trunk', 'show ip route', 'show running-config'].map(command => <button key={command} onClick={() => setConsoleText(`$ ${command}\nSimulated command selected. Pair an explicitly authorized lab device before any real execution.`)}>{command}</button>)}</div><div className="notice">Real router or switch access is disabled. Future device connections must use an explicit allowlist, read-only credentials, command preview, owner approval and audit logging.</div></article>
    </aside>
  </section>
}
