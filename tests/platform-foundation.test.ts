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
    expect(architecture).toContain('CREATED -> PLANNING -> WAITING_FOR_APPROVAL -> ASSIGNED -> SANDBOX_PROVISIONING -> RUNNING -> TESTING -> REVIEWING -> VALIDATING -> STAGING -> SECURITY_REVIEW -> WAITING_FOR_COMPLETION_APPROVAL -> COMPLETED')
    for (const state of ['REPAIRING', 'FAILED', 'BLOCKED', 'CANCELLED', 'ROLLED_BACK']) {
      expect(architecture).toContain(`\`${state}\``)
    }
    const decision = readFileSync(new URL('../.aios/decisions/0002-task-state-machine.md', import.meta.url), 'utf8')
    expect(decision).toContain('SECURITY_REVIEW -> WAITING_FOR_COMPLETION_APPROVAL -> COMPLETED')
    expect(architecture).toContain('`review_required` to `WAITING_FOR_COMPLETION_APPROVAL`')
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

  it('keeps completed release metadata linked to durable gate evidence', () => {
    const release = JSON.parse(readFileSync(new URL('../.aios/releases/current-release.json', import.meta.url), 'utf8')) as { status: string; completion_evidence: string }
    const evidence = JSON.parse(readFileSync(new URL(`../${release.completion_evidence}`, import.meta.url), 'utf8')) as { gates: Record<string, { status: string }>; residual_risks: string[] }
    expect(release.status).toBe('completed')
    expect(release.completion_evidence).toMatch(/^\.aios\/releases\/evidence\/v\d+\.\d+-completion\.json$/)
    expect(Object.keys(evidence.gates)).toEqual(['implementation', 'tests', 'validation', 'specialist_review', 'security_review', 'evidence_capture', 'required_approval'])
    expect(Object.values(evidence.gates).every(gate => gate.status === 'passed')).toBe(true)
    expect(evidence.residual_risks.length).toBeGreaterThan(0)
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
