'use client'

import { useState } from 'react'

interface SummarizeButtonProps {
  content: string
  title: string
}

export default function SummarizeButton({ content, title }: SummarizeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGeneratedSummary, setHasGeneratedSummary] = useState(false)

  const handleSummarize = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, title }),
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
    
    // Simple markdown to HTML conversion for links
    const htmlSummary = summary.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>')
    
    summaryElement.innerHTML = `
      <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">AI Summary</h3>
      <div class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose prose-sm max-w-none">
        ${htmlSummary}
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
        <button
          onClick={handleSummarize}
          disabled={isLoading}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating summary...' : 'Summarize with AI'}
        </button>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  )
}
