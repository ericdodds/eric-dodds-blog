import { resolveNoteBodyWithIssueHtml } from 'app/lib/github-issue-body-html'
import { extractImageUrlsFromIssueBody, issueBodyToSocialPlainText } from 'app/lib/issue-body-social'
import { findFirstStandaloneTweetUrl } from 'app/lib/tweet-id'
import { hasQuotePostLabel, getQuotePostLabelName } from 'app/lib/github-notes'

const API = 'https://api.typefully.com'

const ALLOWED_PLATFORMS = ['x', 'linkedin', 'mastodon', 'threads', 'bluesky'] as const
type Platform = (typeof ALLOWED_PLATFORMS)[number]

function parsePlatforms(): Platform[] {
  const raw = process.env.TYPEFULLY_PLATFORMS?.trim() || 'x'
  const parts = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as Platform[]
  const out = parts.filter((p): p is Platform => ALLOWED_PLATFORMS.includes(p as Platform))
  return out.length ? out : ['x']
}

function typefullyHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

async function fetchImageForUpload(
  url: string
): Promise<{ buffer: ArrayBuffer; fileName: string } | null> {
  const headers: HeadersInit = {}
  const t = process.env.GITHUB_TOKEN?.trim()
  if (t) {
    try {
      const u = new URL(url)
      const skipBearer =
        u.hostname === 'camo.githubusercontent.com' ||
        u.hostname === 'private-user-images.githubusercontent.com'
      const useBearer =
        !skipBearer &&
        (u.hostname === 'user-images.githubusercontent.com' ||
          u.hostname === 'media.githubusercontent.com' ||
          u.hostname === 'raw.githubusercontent.com' ||
          (u.hostname === 'github.com' &&
            (u.pathname.startsWith('/user-attachments/assets/') || u.pathname.includes('/assets/'))))
      if (useBearer) headers.Authorization = `Bearer ${t}`
    } catch {
      headers.Authorization = `Bearer ${t}`
    }
  }

  const res = await fetch(url, { headers })
  if (!res.ok) return null

  const buffer = await res.arrayBuffer()
  if (buffer.byteLength === 0) return null

  let fileName = 'image.jpg'
  try {
    const pathPart = new URL(url).pathname.split('/').pop() || ''
    if (pathPart && /\.(png|jpe?g|gif|webp)$/i.test(pathPart)) {
      fileName = decodeURIComponent(pathPart.split('?')[0])
    } else {
      const ct = res.headers.get('content-type')
      if (ct?.includes('png')) fileName = 'image.png'
      else if (ct?.includes('webp')) fileName = 'image.webp'
      else if (ct?.includes('gif')) fileName = 'image.gif'
    }
  } catch {
    /* use default */
  }

  return { buffer, fileName: fileName.replace(/[^a-zA-Z0-9._()-]/g, '_') }
}

async function requestPresignedUpload(
  socialSetId: string,
  apiKey: string,
  fileName: string
): Promise<{ media_id: string; upload_url: string } | null> {
  const res = await fetch(`${API}/v2/social-sets/${socialSetId}/media/upload`, {
    method: 'POST',
    headers: typefullyHeaders(apiKey),
    body: JSON.stringify({ file_name: fileName }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { media_id?: string; upload_url?: string }
  if (!data.media_id || !data.upload_url) return null
  return { media_id: data.media_id, upload_url: data.upload_url }
}

async function putToPresignedUrl(uploadUrl: string, buffer: ArrayBuffer): Promise<boolean> {
  const res = await fetch(uploadUrl, { method: 'PUT', body: buffer })
  return res.ok || res.status === 204
}

function mediaPollConfig(): { maxAttempts: number; delayMs: number } {
  const attempts = Math.min(
    Math.max(1, Number(process.env.TYPEFULLY_MEDIA_POLL_ATTEMPTS || '18') || 18),
    60
  )
  const delayMs = Math.min(
    Math.max(200, Number(process.env.TYPEFULLY_MEDIA_POLL_MS || '1000') || 1000),
    3000
  )
  return { maxAttempts: attempts, delayMs }
}

/** Avoid Vercel/serverless timeouts: keep total wait bounded; draft still creates without tardy media_ids. */
async function waitMediaReady(
  socialSetId: string,
  apiKey: string,
  mediaId: string,
  maxAttempts?: number,
  delayMs?: number
): Promise<boolean> {
  const cfg = mediaPollConfig()
  const attempts = maxAttempts ?? cfg.maxAttempts
  const waitMs = delayMs ?? cfg.delayMs
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${API}/v2/social-sets/${socialSetId}/media/${mediaId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) return false
    const data = (await res.json()) as { status?: string }
    if (data.status === 'ready') return true
    if (data.status === 'failed') return false
    await new Promise((r) => setTimeout(r, waitMs))
  }
  return false
}

async function uploadRemoteImageToTypefully(
  socialSetId: string,
  apiKey: string,
  imageUrl: string
): Promise<string | null> {
  const fetched = await fetchImageForUpload(imageUrl)
  if (!fetched) return null

  const presigned = await requestPresignedUpload(socialSetId, apiKey, fetched.fileName)
  if (!presigned) return null

  const putOk = await putToPresignedUrl(presigned.upload_url, fetched.buffer)
  if (!putOk) return null

  const ready = await waitMediaReady(socialSetId, apiKey, presigned.media_id)
  return ready ? presigned.media_id : null
}

type TypefullyPlatformPost = {
  text: string
  media_ids: string[]
  /** X-only: convert this post into a quote-post of the given X status URL. */
  quote_post_url?: string
}

function buildPlatformsJson(
  text: string,
  mediaIds: string[],
  quotePostUrl: string | null
) {
  const platformsList = parsePlatforms()
  const platforms: Record<
    string,
    { enabled: boolean; posts: TypefullyPlatformPost[]; settings: Record<string, never> }
  > = {}
  for (const p of platformsList) {
    const post: TypefullyPlatformPost = { text, media_ids: mediaIds }
    // `quote_post_url` is only valid on X per Typefully's API; other platforms
    // reject it with VALIDATION_ERROR / extra_forbidden.
    if (p === 'x' && quotePostUrl) {
      post.quote_post_url = quotePostUrl
    }
    platforms[p] = { enabled: true, posts: [post], settings: {} }
  }
  return platforms
}

export type TypefullySyncIssueInput = {
  number: number
  title: string
  body: string | null
  html_url: string
  labels?: { name: string }[] | null
}

export type TypefullySyncResult =
  | { ok: true; draftId: number; privateUrl?: string }
  | { ok: false; reason: string }

/** Remove a specific URL line from the plain-text post body. */
function removeUrlLineFromText(text: string, url: string): string {
  if (!text || !url) return text
  const lines = text.split(/\r?\n/)
  const filtered = lines.filter((line) => line.trim() !== url.trim())
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Create a Typefully draft from a published note (issue body + images).
 * Requires TYPEFULLY_API_KEY and TYPEFULLY_SOCIAL_SET_ID.
 *
 * If the note carries the quote-post label (see `NOTES_QUOTE_POST_LABEL`) and
 * contains a standalone X status URL, that URL becomes `quote_post_url` and
 * is stripped from the post text so X publishes it as a native quote-post.
 */
export async function createTypefullyDraftFromIssue(
  issue: TypefullySyncIssueInput
): Promise<TypefullySyncResult> {
  const apiKey = process.env.TYPEFULLY_API_KEY?.trim()
  const socialSetId = process.env.TYPEFULLY_SOCIAL_SET_ID?.trim()
  if (!apiKey || !socialSetId) {
    return { ok: false, reason: 'Typefully not configured (API key or social set id missing)' }
  }

  const issueBody = await resolveNoteBodyWithIssueHtml(issue.body, issue.number)

  const plain = issueBodyToSocialPlainText(issueBody)

  const isQuotePost = hasQuotePostLabel(issue.labels ?? undefined)
  let quotePostUrl: string | null = null
  let text = plain || issue.title || ' '

  if (isQuotePost) {
    quotePostUrl = findFirstStandaloneTweetUrl(issueBody)
    if (quotePostUrl) {
      text = removeUrlLineFromText(text, quotePostUrl) || issue.title || ' '
    } else {
      console.warn(
        `[typefully] note #${issue.number} has label "${getQuotePostLabelName()}" but no standalone X URL found; falling back to normal draft`
      )
    }
  }

  const imageUrls = extractImageUrlsFromIssueBody(issueBody || '')
  const maxImages = Math.min(Number(process.env.TYPEFULLY_MAX_IMAGES || '4') || 4, 10)
  const toUpload = imageUrls.slice(0, maxImages)

  const mediaResults = await Promise.all(
    toUpload.map((url) => uploadRemoteImageToTypefully(socialSetId, apiKey, url))
  )
  const mediaIds = mediaResults.filter((id): id is string => id != null)

  const body: Record<string, unknown> = {
    platforms: buildPlatformsJson(text, mediaIds, quotePostUrl),
    draft_title: `${issue.title} (#${issue.number})`,
    scratchpad_text: `Source: ${issue.html_url}`,
  }

  const res = await fetch(`${API}/v2/social-sets/${socialSetId}/drafts`, {
    method: 'POST',
    headers: typefullyHeaders(apiKey),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    return { ok: false, reason: `Typefully ${res.status}: ${errText.slice(0, 500)}` }
  }

  const created = (await res.json()) as {
    id?: number
    /** Deprecated field; some responses may only include this */
    draft_id?: number
    private_url?: string
  }
  const draftId = created.id ?? created.draft_id
  if (draftId == null) {
    return { ok: false, reason: 'Typefully response missing draft id' }
  }

  return { ok: true, draftId, privateUrl: created.private_url }
}
