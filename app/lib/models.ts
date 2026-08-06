// Model registry for AI summarization.
// Pure data — no React/icons — so the API route and tests don't pull icon
// components into the server bundle. Icons live in app/components/model-icons.tsx.

export interface ModelConfig {
  id: string
  name: string
  provider: string
}

export const MODELS: Record<string, ModelConfig> = {
  'openai': {
    id: 'openai/gpt-5',
    name: 'OpenAI',
    provider: 'OpenAI',
  },
  'anthropic': {
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Anthropic',
    provider: 'Anthropic',
  },
  'google': {
    id: 'google/gemini-2.5-pro',
    name: 'Google',
    provider: 'Google',
  },
  'perplexity': {
    id: 'perplexity/sonar-pro',
    name: 'Perplexity',
    provider: 'Perplexity',
  },
  'xai': {
    id: 'xai/grok-2',
    name: 'xAI',
    provider: 'xAI',
  }
}

export const getModelById = (id: string): ModelConfig | undefined => {
  return Object.values(MODELS).find(model => model.id === id)
}
