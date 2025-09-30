import React from 'react'
import { OpenAI, Claude, Gemini, Perplexity, XAI } from '@lobehub/icons'

export const LobeHubPreview: React.FC = () => {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center gap-2">
        <OpenAI size={20} />
        <span className="text-sm font-medium">OpenAI</span>
      </div>
      <div className="flex items-center gap-2">
        <Claude size={20} />
        <span className="text-sm font-medium">Anthropic</span>
      </div>
      <div className="flex items-center gap-2">
        <Gemini size={20} />
        <span className="text-sm font-medium">Google</span>
      </div>
      <div className="flex items-center gap-2">
        <Perplexity size={20} />
        <span className="text-sm font-medium">Perplexity</span>
      </div>
      <div className="flex items-center gap-2">
        <XAI size={20} />
        <span className="text-sm font-medium">xAI</span>
      </div>
    </div>
  )
}
