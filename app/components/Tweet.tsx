import { Suspense } from 'react'
import { Tweet as ReactTweet } from 'react-tweet'
import 'react-tweet/theme.css'

function TweetFallback({ url }: { url?: string }) {
  return (
    <div className="tweet-embed-fallback my-6 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-sm text-neutral-600 dark:text-neutral-400">
      {url ? (
        <>
          Loading post…{' '}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 decoration-neutral-400 dark:decoration-neutral-600"
          >
            View on X
          </a>
        </>
      ) : (
        <>Loading post…</>
      )}
    </div>
  )
}

/**
 * Server-rendered X/Twitter embed. `react-tweet` fetches tweet data from X's
 * public syndication API during render, so this works with SSR + ISR without
 * needing client-side `widgets.js`.
 */
export default function Tweet({ id, url }: { id: string; url?: string }) {
  return (
    <div className="tweet-embed not-prose my-6 flex justify-center" data-theme="light">
      <Suspense fallback={<TweetFallback url={url} />}>
        {/* react-tweet's server component resolves tweet data during render */}
        <ReactTweet id={id} />
      </Suspense>
    </div>
  )
}
