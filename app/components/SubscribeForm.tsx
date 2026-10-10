'use client'

import { useId, useState, type FormEvent } from 'react'
import { track } from '@vercel/analytics'

export default function SubscribeForm({ source }: { source: 'footer' | 'subscribe_page' }) {
  const id = useId()
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError('')

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), website: form.get('website') }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to subscribe. Please try again.')
      setSuccess(true)
      if (!form.get('website')) {
        try {
          track('subscription_success', { source })
        } catch {
          // Analytics must not turn a completed signup into a form error.
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to subscribe. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      {success ? (
        <p role="status" className="text-sm text-neutral-600 dark:text-neutral-300">
          You’re subscribed. Thanks for reading!
        </p>
      ) : (
        <form onSubmit={subscribe} aria-busy={pending}>
          <label htmlFor={`${id}-email`} className="mb-2 block text-sm">Email address</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              maxLength={254}
              disabled={pending}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-neutral-700"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              {pending ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>
          <div hidden aria-hidden="true">
            <label htmlFor={`${id}-website`}>Website</label>
            <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          {error ? <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </form>
      )}
    </div>
  )
}
