import { describe, expect, it } from 'vitest'
import { agents, providers } from '../src/data'
// @ts-expect-error Node built-ins are available in the Vitest runtime; the browser bundle intentionally omits Node types.
import { readFileSync } from 'node:fs'

describe('Robot Guild product contract', () => {
  it('keeps the five-stage human-reviewed factory workflow', () => {
    expect(agents.map(agent => agent.id)).toEqual(['router', 'planner', 'builder', 'tester', 'reviewer'])
  })

  it('keeps OpenRouter and local-model discovery available', () => {
    expect(providers.some(provider => provider[0] === 'OpenRouter')).toBe(true)
    expect(providers.some(provider => provider[0] === 'Ollama')).toBe(true)
  })

  it('keeps the authorized lab deny-by-default boundaries', () => {
    const companion = readFileSync(new URL('../public/aios-terminal-companion.mjs', import.meta.url), 'utf8')
    expect(companion).toContain('internal: true')
    expect(companion).toContain('cap_drop: ["ALL"]')
    expect(companion).toContain('no-new-privileges:true')
    expect(companion).toContain("input.authorization !== 'I OWN THIS LOCAL LAB'")
    expect(companion).not.toContain('/var/run/docker.sock')
  })

})
