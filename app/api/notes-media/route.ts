import { NextRequest, NextResponse } from 'next/server'
import { noteImageUrlShouldBeProxied } from 'app/lib/rewrite-note-images'
import { resolveFreshIssueImageSrc } from 'app/lib/github-issue-body-html'

/**
 * Proxies GitHub-hosted note images so they work for private repos (browser requests
 * cannot send GITHUB_TOKEN; the issue body still contains raw user-images URLs).
 *
 * When `issue` is provided and the direct fetch fails (user-attachments URLs on
 * private repos, or private-user-images URLs whose ~5-minute JWT expired), the
 * proxy re-resolves a fresh URL from the issue's rendered HTML via GraphQL.
 */

/** URL forms whose failures can be fixed by re-resolving through GraphQL. */
function canReResolve(u: URL): boolean {
  if (u.hostname === 'private-user-images.githubusercontent.com') return true
  if (u.hostname === 'github.com' && u.pathname.startsWith('/user-attachments/assets/')) return true
  return false
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) {
    return new NextResponse('Missing url', { status: 400 })
  }
  const issueRaw = req.nextUrl.searchParams.get('issue')
  const issueNumber = issueRaw != null ? Number(issueRaw) : NaN

  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return new NextResponse('Invalid url encoding', { status: 400 })
  }

  const trimmed = decoded.trim()
  if (!noteImageUrlShouldBeProxied(trimmed)) {
    return new NextResponse('URL host not allowed', { status: 403 })
  }

  const token = process.env.GITHUB_TOKEN?.trim()
  const headers: HeadersInit = {
    Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'User-Agent': 'eric-dodds-blog/notes-media',
  }

  let u: URL
  try {
    u = new URL(trimmed)
  } catch {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  const useGithubToken =
    token &&
    (u.hostname === 'user-images.githubusercontent.com' ||
      u.hostname === 'media.githubusercontent.com' ||
      (u.hostname === 'github.com' &&
        (u.pathname.startsWith('/user-attachments/assets/') ||
          u.pathname.includes('/assets/'))))
  if (useGithubToken) {
    headers.Authorization = `Bearer ${token}`
  }

  let upstream = await fetch(trimmed, { headers, redirect: 'follow' })

  if (!upstream.ok && Number.isFinite(issueNumber) && issueNumber > 0 && canReResolve(u)) {
    const fresh = await resolveFreshIssueImageSrc(issueNumber, trimmed)
    if (fresh && fresh !== trimmed && noteImageUrlShouldBeProxied(fresh)) {
      // Freshly-minted JWT URLs are directly fetchable; no Authorization needed.
      upstream = await fetch(fresh, {
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'User-Agent': 'eric-dodds-blog/notes-media',
        },
        redirect: 'follow',
      })
    }
  }

  if (!upstream.ok) {
    return new NextResponse('Image unavailable', {
      status: upstream.status === 404 ? 404 : 502,
    })
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
  if (contentType.includes('text/html')) {
    return new NextResponse('Upstream returned HTML, not an image', { status: 502 })
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
