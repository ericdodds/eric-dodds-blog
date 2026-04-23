/** Hostnames that X/Twitter serves status URLs from. */
const TWEET_HOSTNAMES = new Set([
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
  'mobile.x.com',
])

/**
 * Parse an X/Twitter status URL into its numeric tweet id, or null.
 * Accepts the common `x.com/<handle>/status/<id>` and `twitter.com/...` shapes.
 */
export function extractTweetId(url: string): string | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }
  if (!TWEET_HOSTNAMES.has(parsed.hostname.toLowerCase())) return null
  const segments = parsed.pathname.split('/').filter(Boolean)
  // Expect: [handle, 'status' | 'statuses', id, ...]
  const statusIdx = segments.findIndex((s) => s === 'status' || s === 'statuses')
  if (statusIdx === -1) return null
  const id = segments[statusIdx + 1]
  if (!id || !/^\d{5,32}$/.test(id)) return null
  return id
}

/** Convenience: is this URL an X/Twitter status URL we can embed? */
export function isTweetUrl(url: string): boolean {
  return extractTweetId(url) != null
}

/**
 * Find the first standalone tweet URL in note markdown. "Standalone" means a
 * URL that sits on its own line (e.g. GitHub autolinks a bare URL) and is not
 * wrapped in `[text](url)` markdown-link syntax.
 */
export function findFirstStandaloneTweetUrl(markdown: string | null | undefined): string | null {
  if (!markdown) return null
  const lines = markdown.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    // Skip lines that look like markdown link/image syntax; the URL inside
    // `[text](url)` is intentional inline reference, not a standalone embed.
    if (/^!?\[[^\]]*\]\([^)]+\)/.test(line)) continue
    // Only consider lines whose sole content is a URL (possibly wrapped in <>).
    const unwrapped = line.replace(/^<(.*)>$/, '$1').trim()
    if (!/^https?:\/\/\S+$/i.test(unwrapped)) continue
    if (isTweetUrl(unwrapped)) return unwrapped
  }
  return null
}
