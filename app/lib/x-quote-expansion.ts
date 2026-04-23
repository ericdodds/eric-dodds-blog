import { getTweet } from 'react-tweet/api'
import type { Tweet } from 'react-tweet/api'
import { extractTweetId, findFirstStandaloneTweetUrl } from 'app/lib/tweet-id'

/** HTML comment markers wrapping the bot-managed quote expansion block. */
export const X_QUOTE_EXPANSION_START = '<!-- x-quote-expansion:start -->'
export const X_QUOTE_EXPANSION_END = '<!-- x-quote-expansion:end -->'

const EXPANSION_BLOCK_RE =
  /<!-- x-quote-expansion:start -->[\s\S]*?<!-- x-quote-expansion:end -->/

const X_SOURCE_ID_RE = /<!--\s*x-quote-source:(\d+)\s*-->/

/**
 * Minimal subset of the `Tweet` shape this module depends on. Kept narrow so
 * tests can build fixtures without constructing the whole `Tweet` type tree.
 */
export type QuoteTweetLike = {
  id_str: string
  text: string
  user: { screen_name: string }
  entities: {
    urls: { url: string; expanded_url: string; indices: [number, number] }[]
  }
  display_text_range?: [number, number]
  quoted_tweet?: {
    id_str: string
    user: { screen_name: string }
  }
}

/** Decode the small set of HTML entities X's syndication API returns. */
export function decodeTweetEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function isStatusUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!/(^|\.)x\.com$/i.test(u.hostname) && !/(^|\.)twitter\.com$/i.test(u.hostname)) {
      return false
    }
    return /\/status(?:es)?\/\d+/.test(u.pathname)
  } catch {
    return false
  }
}

/**
 * Extract the visible commentary text of a quote-tweet, stripping the
 * trailing `t.co` URL that X appends to point at the quoted tweet.
 */
export function extractCommentaryText(tweet: QuoteTweetLike): string {
  let text = tweet.text

  // If any URL entity resolves to a status URL, splice it out by indices.
  // `entities.urls` gives us both the visible t.co and its expanded_url.
  const statusUrl = tweet.entities?.urls?.find((u) =>
    isStatusUrl(u.expanded_url || '')
  )

  if (statusUrl && Array.isArray(statusUrl.indices) && statusUrl.indices.length === 2) {
    const [start, end] = statusUrl.indices
    text = text.slice(0, start) + text.slice(end)
  } else if (
    tweet.display_text_range &&
    tweet.display_text_range.length === 2 &&
    tweet.display_text_range[1] <= text.length
  ) {
    // Fallback: slice to the visible text range.
    text = text.slice(tweet.display_text_range[0], tweet.display_text_range[1])
  }

  return decodeTweetEntities(text).replace(/\s+$/g, '').trim()
}

/**
 * Given the user's quote-post tweet (already fetched), produce the managed
 * markdown block that gets inserted into the GitHub issue body.
 *
 * Layout:
 *   <!-- x-quote-expansion:start -->
 *   <!-- x-quote-source:<quote_id> -->
 *   <commentary>
 *
 *   <quoted original tweet URL>       (omitted if quoted_tweet missing)
 *
 *   [Discuss on X](<quote post url>)
 *   <!-- x-quote-expansion:end -->
 */
export function buildQuoteExpansionBlock(
  quoteTweet: QuoteTweetLike,
  quotePostUrl: string
): string {
  const commentary = extractCommentaryText(quoteTweet)

  let quotedUrl: string | null = null
  if (quoteTweet.quoted_tweet) {
    const handle = quoteTweet.quoted_tweet.user?.screen_name
    const id = quoteTweet.quoted_tweet.id_str
    if (handle && id) quotedUrl = `https://x.com/${handle}/status/${id}`
  }

  const parts: string[] = []
  parts.push(X_QUOTE_EXPANSION_START)
  parts.push(`<!-- x-quote-source:${quoteTweet.id_str} -->`)
  if (commentary) parts.push(commentary)
  if (quotedUrl) {
    parts.push('')
    parts.push(quotedUrl)
  }
  parts.push('')
  parts.push(`[Discuss on X](${quotePostUrl})`)
  parts.push(X_QUOTE_EXPANSION_END)

  return parts.join('\n')
}

/** Replace an existing expansion block, or append one with a leading blank line. */
export function mergeQuoteExpansionBlockIntoIssueBody(
  currentBody: string | null | undefined,
  newBlock: string
): string {
  const body = currentBody ?? ''
  if (EXPANSION_BLOCK_RE.test(body)) {
    return body.replace(EXPANSION_BLOCK_RE, newBlock.trim())
  }
  const sep = body.endsWith('\n') || body.length === 0 ? '' : '\n\n'
  return `${body}${sep}${newBlock.trim()}\n`
}

/**
 * Return the tweet id embedded in an existing expansion marker, or null if
 * the body does not contain an expansion yet.
 */
export function readExpansionSourceId(body: string | null | undefined): string | null {
  if (!body) return null
  const m = body.match(X_SOURCE_ID_RE)
  return m?.[1] ?? null
}

export type ComputeExpansionResult =
  | { ok: false; reason: 'no_tweet_url' | 'tweet_fetch_failed' | 'invalid_tweet_id' }
  | { ok: true; changed: boolean; nextBody: string; quoteTweetId: string }

/**
 * Allow tests (and the route handler in emergencies) to swap the fetcher.
 * Default is `react-tweet/api`'s `getTweet`, which calls X syndication.
 */
export type FetchQuoteTweet = (id: string) => Promise<QuoteTweetLike | null>

async function defaultFetchQuoteTweet(id: string): Promise<QuoteTweetLike | null> {
  const tweet: Tweet | undefined = await getTweet(id)
  return (tweet as unknown as QuoteTweetLike) ?? null
}

/**
 * Look for my own quote-post URL in the issue body, fetch it, and return the
 * new issue body with the managed expansion block merged in. Idempotent: if
 * the expansion already points at the same tweet id and the body matches,
 * `changed` is false and `nextBody === currentBody`.
 */
export async function computeQuoteExpansion(
  currentBody: string | null,
  fetcher: FetchQuoteTweet = defaultFetchQuoteTweet
): Promise<ComputeExpansionResult> {
  const quoteUrl = findFirstStandaloneTweetUrl(currentBody ?? '')
  if (!quoteUrl) return { ok: false, reason: 'no_tweet_url' }

  const id = extractTweetId(quoteUrl)
  if (!id) return { ok: false, reason: 'invalid_tweet_id' }

  const tweet = await fetcher(id)
  if (!tweet) return { ok: false, reason: 'tweet_fetch_failed' }

  const block = buildQuoteExpansionBlock(tweet, quoteUrl)
  const nextBody = mergeQuoteExpansionBlockIntoIssueBody(currentBody, block)
  const changed = nextBody !== (currentBody ?? '')

  return { ok: true, changed, nextBody, quoteTweetId: id }
}
