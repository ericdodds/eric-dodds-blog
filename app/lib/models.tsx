// Model registry for AI summarization
import React from 'react'
import { OpenAI, Claude, Gemini, Perplexity, XAI } from '@lobehub/icons'

export interface ModelConfig {
  id: string
  name: string
  provider: string
  logo: React.ReactNode
}

export const MODELS: Record<string, ModelConfig> = {
  'openai': {
    id: 'openai/gpt-5',
    name: 'OpenAI',
    provider: 'OpenAI',
    logo: <OpenAI size={16} />
  },
  'anthropic': {
    id: 'anthropic/claude-sonnet-4',
    name: 'Anthropic',
    provider: 'Anthropic',
    logo: <Claude size={16} />
  },
  'google': {
    id: 'google/gemini-2.5-pro',
    name: 'Google',
    provider: 'Google',
    logo: <Gemini size={16} />
  },
  'perplexity': {
    id: 'perplexity/sonar-pro',
    name: 'Perplexity',
    provider: 'Perplexity',
    logo: <Perplexity size={16} />
  },
  'xai': {
    id: 'xai/grok-2',
    name: 'xAI',
    provider: 'xAI',
    logo: <XAI size={16} />
  }
}

export const getModelById = (id: string): ModelConfig | undefined => {
  return Object.values(MODELS).find(model => model.id === id)
}

export const getModelByProvider = (provider: string): ModelConfig | undefined => {
  return MODELS[provider.toLowerCase()]
}
