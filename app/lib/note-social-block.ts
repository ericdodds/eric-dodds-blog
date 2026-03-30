/** Delimiters for bot-managed social links on GitHub issue bodies (markdown + HTML comments). */
export const NOTE_SOCIAL_START = '<!-- note-social:start -->'
export const NOTE_SOCIAL_END = '<!-- note-social:end -->'

export type GithubIssueRef = { owner: string; repo: string; number: number }

/** Parse `Source: https://github.com/owner/repo/issues/n` from Typefully scratchpad. */
export function parseGithubIssueRefFromScratchpad(
  scratchpad: string | null | undefined
): GithubIssueRef | null {
  if (!scratchpad?.trim()) return null
  const line =
    scratchpad
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /^source\s*:/i.test(l)) ?? null
  if (!line) return null
  const rest = line.replace(/^source\s*:/i, '').trim()
  try {
    const u = new URL(rest)
    if (u.hostname !== 'github.com') return null
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length < 4 || parts[2] !== 'issues') return null
    const owner = parts[0]
    const repo = parts[1]
    const n = Number(parts[3])
    if (!Number.isFinite(n)) return null
    return { owner, repo, number: n }
  } catch {
    return null
  }
}

export type PublishedPlatformLink = { label: string; url: string }

export function collectPublishedPlatformLinks(data: {
  x_published_url?: string | null
  linkedin_published_url?: string | null
  threads_published_url?: string | null
  bluesky_published_url?: string | null
  mastodon_published_url?: string | null
}): PublishedPlatformLink[] {
  const out: PublishedPlatformLink[] = []
  const add = (label: string, url?: string | null) => {
    const u = url?.trim()
    if (u) out.push({ label, url: u })
  }
  add('X', data.x_published_url)
  add('LinkedIn', data.linkedin_published_url)
  add('Threads', data.threads_published_url)
  add('Bluesky', data.bluesky_published_url)
  add('Mastodon', data.mastodon_published_url)
  return out
}

/** Markdown block that replaces content between NOTE_SOCIAL_* markers. */
export function buildNoteSocialBlock(draftId: number, links: PublishedPlatformLink[]): string {
  const lines = links.map((l) => `- [${l.label}](${l.url})`)
  const body =
    links.length > 0
      ? `**Also on social**\n${lines.join('\n')}`
      : '_Social links will appear here after publish._'
  return `${NOTE_SOCIAL_START}
<!-- typefully-draft:${draftId} -->
${body}
${NOTE_SOCIAL_END}`
}

const SOCIAL_BLOCK_RE = /<!-- note-social:start -->[\s\S]*?<!-- note-social:end -->/

export function mergeSocialBlockIntoIssueBody(
  currentBody: string | null | undefined,
  newBlock: string
): string {
  const body = currentBody ?? ''
  if (SOCIAL_BLOCK_RE.test(body)) {
    return body.replace(SOCIAL_BLOCK_RE, newBlock.trim())
  }
  const sep = body.endsWith('\n') || body.length === 0 ? '' : '\n\n'
  return `${body}${sep}${newBlock.trim()}\n`
}

/**
 * MDX treats `<` as JSX; raw `<!-- ... -->` in issue bodies can crash compile.
 * Strip only the bot-managed markers; leave "**Also on social**" markdown intact.
 */
export function stripTypefullySocialHtmlCommentsForMdx(markdown: string): string {
  return markdown
    .replace(/<!--\s*note-social:start\s*-->/gi, '')
    .replace(/<!--\s*note-social:end\s*-->/gi, '')
    .replace(/<!--\s*typefully-draft:\d+\s*-->/gi, '')
}
