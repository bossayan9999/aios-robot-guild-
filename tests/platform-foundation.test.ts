import { describe, expect, it } from 'vitest'
// @ts-expect-error Node built-ins are available in the Vitest runtime; the browser bundle intentionally omits Node types.
import { readFileSync } from 'node:fs'

const foundationFiles = [
  'mission.md',
  'vision.md',
  'architecture.md',
  'roadmap.md',
  'security-policy.md',
  'agentic-engineering-loop.md',
  'sandbox-policy.md',
  'completion-gates.md',
  'specialists.md',
  'connectors.md',
]

function readFoundation(name: string) {
  return readFileSync(new URL(`../.aios/${name}`, import.meta.url), 'utf8')
}

describe('CyberScool platform foundation', () => {
  it('keeps every required foundation contract available', () => {
    for (const name of foundationFiles) {
      expect(readFoundation(name).trim().length, name).toBeGreaterThan(100)
    }
    const agents = readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8')
    expect(agents).toContain('.aios/completion-gates.md')
  })

  it('keeps the canonical task lifecycle and exceptional states documented', () => {
    const architecture = readFoundation('architecture.md')
    expect(architecture).toContain('draft -> planned -> awaiting_approval -> queued -> executing -> validating -> specialist_review -> security_review -> awaiting_completion_approval -> completed')
    for (const state of ['blocked', 'failed', 'cancelled', 'rolled_back']) {
      expect(architecture).toContain(`\`${state}\``)
    }
  })

  it('requires every completion gate before completion', () => {
    const gates = readFoundation('completion-gates.md')
    for (const gate of ['Implementation', 'Tests', 'Validation', 'Specialist review', 'Security review', 'Evidence capture', 'Required approvals']) {
      expect(gates).toContain(`**${gate}**`)
    }
    expect(gates).toContain('The control plane, not an agent or UI, computes completion eligibility.')
  })

  it('keeps execution sandboxed and connector access least-privileged', () => {
    const sandbox = readFoundation('sandbox-policy.md')
    const connectors = readFoundation('connectors.md')
    expect(sandbox).toContain('Anything not granted is denied.')
    expect(sandbox).toContain('no host/container-engine socket')
    expect(connectors).toContain('Installation is not authorization')
    expect(connectors).toContain('Connector content is untrusted')
  })

  it('defines all required specialists', () => {
    const specialists = readFoundation('specialists.md')
    for (const role of [
      'Copilot Manager',
      'Tech Development',
      'Business',
      'Finance advisory',
      'CCNA Network and Security',
      'Cybersecurity',
      'DevOps',
      'Research and OSINT',
      'UI and UX',
      'Custom specialist builder',
    ]) {
      expect(specialists).toContain(`## ${role}`)
    }
  })
})
