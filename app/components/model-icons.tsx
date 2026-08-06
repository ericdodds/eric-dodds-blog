// Icon map for the AI model picker, keyed by the MODELS registry key.
// Imported only from client components so @lobehub/icons stays out of
// server bundles (the summarize API route only needs the data registry).
import React from 'react'
import { OpenAI, Claude, Gemini, Perplexity, XAI } from '@lobehub/icons'

export const MODEL_ICONS: Record<string, React.ReactNode> = {
  'openai': <OpenAI size={16} />,
  'anthropic': <Claude size={16} />,
  'google': <Gemini size={16} />,
  'perplexity': <Perplexity size={16} />,
  'xai': <XAI size={16} />,
}
