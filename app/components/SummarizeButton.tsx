'use client'

import { useState, useEffect, useRef } from 'react'
import { MODELS } from '../lib/models'

interface SummarizeButtonProps {
  content: string
  title: string
}

export default function SummarizeButton({ content, title }: SummarizeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGeneratedSummary, setHasGeneratedSummary] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-5')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSummarize = async (modelId: string) => {
    setIsLoading(true)
    setError(null)
    setIsDropdownOpen(false)
    
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, title, model: modelId }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      
      // Insert summary into DOM at the right location
      insertSummaryIntoDOM(data.summary)
      
      // Mark that we've generated a summary
      setHasGeneratedSummary(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const insertSummaryIntoDOM = (summary: string) => {
    // Remove existing summary if any
    const existingSummary = document.getElementById('ai-summary-container')
    if (existingSummary) {
      existingSummary.remove()
    }

    // Create summary element
    const summaryElement = document.createElement('div')
    summaryElement.id = 'ai-summary-container'
    summaryElement.className = 'mt-4 mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border'
    
    summaryElement.innerHTML = `
      <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">AI Summary</h3>
      <div class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm max-w-none">
        ${summary}
      </div>
      <!-- <button class="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" id="hide-summary-btn">Hide summary</button> -->
    `
    
    // Try multiple selectors to find the right insertion point
    const dateSection = document.querySelector('div.flex.justify-between.items-center')
    const article = document.querySelector('article.prose')
    const section = document.querySelector('section')
    
    if (dateSection) {
      // Insert after the date section
      dateSection.insertAdjacentElement('afterend', summaryElement)
    } else if (section) {
      // Fallback: insert as second child of section
      section.insertBefore(summaryElement, section.children[1])
    } else {
      // Last resort: append to body
      document.body.appendChild(summaryElement)
    }
    
    // Add event listener for hide button
    const hideBtn = summaryElement.querySelector('#hide-summary-btn')
    hideBtn?.addEventListener('click', () => {
      summaryElement.remove()
    })
  }

  return (
    <>
      {hasGeneratedSummary ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Remember, AI can hallucinate!
        </p>
      ) : (
        <div className="relative inline-block" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoading}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isLoading ? (
              <span className="animate-pulse">Generating summary...</span>
            ) : (
              'Summarize with AI'
            )}
            {!isLoading && (
              <svg 
                className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
          
          {isDropdownOpen && !isLoading && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
              <div className="py-1">
                {Object.entries(MODELS).map(([key, model]) => (
                  <button
                    key={key}
                    onClick={() => handleSummarize(model.id)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <span className="text-lg">{model.logo}</span>
                    <span>{model.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  )
}
