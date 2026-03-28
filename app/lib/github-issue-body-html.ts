import { cache } from 'react'
import { GITHUB_NOTES_CACHE_TAG, getNotesGitHubRepo } from 'app/lib/github-notes'

const USER_ATTACHMENTS = 'github.com/user-attachments/assets/'

function notesFetchInit(): RequestInit {
  if (process.env.NODE_ENV === 'development') {
    return { cache: 'no-store' as const }
  }
  return { next: { tags: [GITHUB_NOTES_CACHE_TAG], revalidate: 3600 } }
}

/**
 * Issue `body` from the REST API uses `github.com/user-attachments/assets/:id`, which
 * returns 404 for unauthenticated / non-browser requests on private repos.
 * GraphQL `bodyHTML` contains the rendered `<img src="…">` URLs GitHub actually serves
 * (e.g. `private-user-images…` with a short-lived JWT).
 */
export const getIssueBodyHtml = cache(async (issueNumber: number): Promise<string | null> => {
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
    ...notesFetchInit(),
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
})

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

/** When markdown still has user-attachments links, swap in resolvable URLs from GraphQL HTML. */
export async function resolveNoteBodyWithIssueHtml(
  body: string | null,
  issueNumber: number
): Promise<string> {
  const s = body || ''
  if (!s.includes(USER_ATTACHMENTS)) return s
  const html = await getIssueBodyHtml(issueNumber)
  if (!html) return s
  return resolveUserAttachmentMarkdown(s, html)
}
