import { Suspense } from 'react'
import { EmbeddedTweet } from 'react-tweet'
import { getTweet, type Tweet as TweetData } from 'react-tweet/api'
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
 * X's syndication API sometimes returns a (quoted) tweet whose `entities` object
 * is empty `{}`. react-tweet's `enrichTweet` then runs `for (…of entities.hashtags)`
 * with no guard and throws `c is not iterable`, which fails the entire `/notes`
 * prerender. Backfill the four required entity arrays (`media` is already guarded
 * upstream) so enrichment can never throw.
 */
function ensureEntities(t: { entities?: unknown } | null | undefined): void {
  if (!t) return
  const obj = t as { entities?: Record<string, unknown> }
  const e = (obj.entities ??= {})
  for (const key of ['hashtags', 'user_mentions', 'urls', 'symbols'] as const) {
    if (!Array.isArray(e[key])) e[key] = []
  }
}

function sanitizeTweet(tweet: TweetData): TweetData {
  ensureEntities(tweet)
  ensureEntities(tweet.quoted_tweet)
  return tweet
}

async function TweetContent({ id, url }: { id: string; url?: string }) {
  let tweet: TweetData | undefined
  try {
    tweet = await getTweet(id, { next: { revalidate: 3600 } } as RequestInit)
  } catch {
    return <TweetFallback url={url} />
  }
  if (!tweet) return <TweetFallback url={url} />
  return <EmbeddedTweet tweet={sanitizeTweet(tweet)} />
}

/**
 * Server-rendered X/Twitter embed. We fetch tweet data ourselves (instead of
 * react-tweet's bundled `<Tweet>`) so we can sanitize malformed entities before
 * react-tweet enriches them — see `sanitizeTweet`. Works with SSR + ISR.
 */
export default function Tweet({ id, url }: { id: string; url?: string }) {
  return (
    <div className="tweet-embed not-prose my-6 flex justify-center" data-theme="light">
      <Suspense fallback={<TweetFallback url={url} />}>
        {/* fetches + sanitizes tweet data during render */}
        <TweetContent id={id} url={url} />
      </Suspense>
    </div>
  )
}
