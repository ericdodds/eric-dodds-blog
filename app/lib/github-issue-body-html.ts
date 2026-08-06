import { stripTypefullySocialHtmlCommentsForMdx } from 'app/lib/note-social-block'
import { getNotesGitHubRepo } from 'app/lib/github-notes'

const USER_ATTACHMENTS = 'github.com/user-attachments/assets/'

/**
 * Issue `body` from the REST API uses `github.com/user-attachments/assets/:id`, which
 * returns 404 for unauthenticated / non-browser requests on private repos.
 * GraphQL `bodyHTML` contains the rendered `<img src="…">` URLs GitHub actually serves
 * (e.g. `private-user-images…` with a short-lived ~5-minute JWT).
 *
 * Because those JWTs expire in minutes, resolved URLs must never be baked into
 * cached page HTML — pages proxy the stable user-attachments URL through
 * /api/notes-media (which calls back into `resolveFreshIssueImageSrc` on demand).
 * This uncached fetch is for request-time consumers: the media proxy and the
 * Typefully push (which uploads immediately, while the JWT is fresh).
 */
async function fetchIssueBodyHtmlFresh(issueNumber: number): Promise<string | null> {
  const repo = getNotesGitHubRepo()
  const token = process.env.GITHUB_TOKEN?.trim()
  if (!repo || !token || !Number.isFinite(issueNumber)) return null

  const query = `
    query IssueBodyHTML($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        issue(number: $number) {
          bodyHTML
        }
      }
    }
  `

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { owner: repo.owner, name: repo.repo, number: issueNumber },
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    console.error('[github-issue-body-html] graphql failed', res.status)
    return null
  }

  const json = (await res.json()) as {
    data?: { repository?: { issue?: { bodyHTML?: string | null } | null } | null }
    errors?: { message: string }[]
  }

  if (json.errors?.length) {
    console.error('[github-issue-body-html] graphql errors', json.errors.map((e) => e.message).join('; '))
    return null
  }

  const html = json.data?.repository?.issue?.bodyHTML
  return typeof html === 'string' && html.length > 0 ? html : null
}

function extractImgSrcsFromIssueBodyHtml(html: string): string[] {
  const out: string[] = []
  const re = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    out.push(m[1])
  }
  return out
}

/** `src` values GitHub emits for real uploads (not the browser-only user-attachments link). */
function isResolvedIssueImageSrc(src: string): boolean {
  if (!src.startsWith('https://')) return false
  if (src.includes(USER_ATTACHMENTS)) return false
  if (src.includes('avatars.githubusercontent.com')) return false
  return (
    src.includes('private-user-images.githubusercontent.com') ||
    src.includes('user-images.githubusercontent.com') ||
    src.includes('camo.githubusercontent.com') ||
    src.includes('media.githubusercontent.com')
  )
}

const ASSET_UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/**
 * Request-time resolution for the media proxy: fetch the issue's rendered HTML
 * fresh (new JWT) and return the served `src` matching `originalUrl`'s asset
 * UUID. Works for both `github.com/user-attachments/assets/<uuid>` originals
 * and expired `private-user-images…<uuid>.png?jwt=…` URLs, whose filenames
 * embed the same UUID.
 */
export async function resolveFreshIssueImageSrc(
  issueNumber: number,
  originalUrl: string
): Promise<string | null> {
  const html = await fetchIssueBodyHtmlFresh(issueNumber)
  if (!html) return null

  const srcs = extractImgSrcsFromIssueBodyHtml(html).filter(isResolvedIssueImageSrc)
  if (srcs.length === 0) return null

  const uuid = originalUrl.match(ASSET_UUID_RE)?.[0]?.toLowerCase()
  if (uuid) {
    const hit = srcs.find((s) => s.toLowerCase().includes(uuid))
    if (hit) return hit
  }
  // No UUID match — only safe to guess when the issue has exactly one image.
  return srcs.length === 1 ? srcs[0] : null
}

/**
 * Pair `…/user-attachments/assets/…` markdown URLs with rendered `<img src>` order from `bodyHTML`.
 */
export function resolveUserAttachmentMarkdown(markdown: string, bodyHtml: string): string {
  const resolvedSrcs = extractImgSrcsFromIssueBodyHtml(bodyHtml).filter(isResolvedIssueImageSrc)
  let idx = 0
  let out = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, rawUrl) => {
    const url = rawUrl.trim().replace(/^<|>$/g, '')
    if (!url.includes(USER_ATTACHMENTS)) return full
    const replacement = resolvedSrcs[idx]
    if (!replacement) return full
    idx += 1
    return `![${alt}](${replacement})`
  })
  out = out.replace(
    /(<img\b[^>]*\bsrc=)(["'])(https:\/\/github\.com\/user-attachments\/assets\/[^"']+)(\2)/gi,
    (full, pre, q, _url) => {
      const replacement = resolvedSrcs[idx]
      if (!replacement) return full
      idx += 1
      return `${pre}${q}${replacement}${q}`
    }
  )
  return out
}

/**
 * Swap user-attachments links for URLs that resolve outside a browser session.
 * For immediate consumers only (Typefully upload right after a webhook) — the
 * substituted JWT URLs expire in ~5 minutes, so never cache or render this
 * output into page HTML. Pages keep the stable user-attachments URLs and let
 * the /api/notes-media proxy resolve them per request instead.
 */
export async function resolveNoteBodyWithIssueHtml(
  body: string | null,
  issueNumber: number
): Promise<string> {
  let s = body || ''
  if (s.includes(USER_ATTACHMENTS)) {
    const html = await fetchIssueBodyHtmlFresh(issueNumber)
    if (html) s = resolveUserAttachmentMarkdown(s, html)
  }
  return stripTypefullySocialHtmlCommentsForMdx(s)
}
