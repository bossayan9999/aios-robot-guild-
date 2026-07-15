import { describe, expect, it } from 'vitest'
import { agents, providers } from '../src/data'

describe('Robot Guild product contract', () => {
  it('keeps the five-stage human-reviewed factory workflow', () => {
    expect(agents.map(agent => agent.id)).toEqual(['router', 'planner', 'builder', 'tester', 'reviewer'])
  })

  it('keeps OpenRouter and local-model discovery available', () => {
    expect(providers.some(provider => provider[0] === 'OpenRouter')).toBe(true)
    expect(providers.some(provider => provider[0] === 'Ollama')).toBe(true)
  })
})
