import type { Agent } from './types'

export const agents: Agent[] = [
  { id: 'router', name: 'Router', role: 'Reads the quest and selects the safest route.', skill: 'Intent Routing', color: '#40e7b0', icon: '⌁' },
  { id: 'planner', name: 'Planner', role: 'Maps scope, dependencies, and acceptance checks.', skill: 'Quest Mapping', color: '#65a8ff', icon: '◇' },
  { id: 'builder', name: 'Builder', role: 'Prepares isolated implementation work.', skill: 'Artifact Forge', color: '#f6be4f', icon: '{ }' },
  { id: 'tester', name: 'Tester', role: 'Collects evidence and validates the result.', skill: 'Quality Shield', color: '#b58cff', icon: '✓' },
  { id: 'reviewer', name: 'Reviewer', role: 'Keeps the final decision under human control.', skill: 'Approval Gate', color: '#ff826d', icon: '◉' },
]

export const providers = [
  ['OpenRouter', 'Search hundreds of hosted models', 'https://openrouter.ai/models', 'https://openrouter.ai/keys'],
  ['OpenAI', 'General reasoning, coding, and agent models', 'https://platform.openai.com/docs/models', 'https://platform.openai.com/api-keys'],
  ['Anthropic', 'Claude reasoning and coding models', 'https://docs.anthropic.com/en/docs/about-claude/models', 'https://console.anthropic.com/settings/keys'],
  ['Google Gemini', 'Gemini multimodal models', 'https://ai.google.dev/gemini-api/docs/models', 'https://aistudio.google.com/app/apikey'],
  ['xAI', 'Grok models and API access', 'https://docs.x.ai/docs/models', 'https://console.x.ai/'],
  ['Mistral', 'Open and hosted Mistral models', 'https://docs.mistral.ai/getting-started/models/', 'https://console.mistral.ai/api-keys/'],
  ['Groq', 'Fast inference for supported open models', 'https://console.groq.com/docs/models', 'https://console.groq.com/keys'],
  ['Ollama', 'Local models without a hosted key', 'https://ollama.com/search', 'https://ollama.com/download'],
] as const
