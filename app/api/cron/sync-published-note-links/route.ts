import { revalidatePath, revalidateTag } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { applyTypefullyPublishedLinksToGithubIssue } from 'app/lib/apply-typefully-published-links'
import { GITHUB_NOTES_CACHE_TAG } from 'app/lib/github-notes'
import { getTypefullyDraft, listTypefullyDraftsPage } from 'app/lib/typefully-drafts-api'

function verifyCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  try {
    const a = Buffer.from(token)
    const b = Buffer.from(secret)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * Backfill: scan published Typefully drafts and sync social URLs into GitHub issues.
 * Schedule via Vercel Cron; set CRON_SECRET and authorize with Authorization: Bearer.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ message: 'CRON_SECRET is not configured' }, { status: 503 })
  }
  if (!verifyCron(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.TYPEFULLY_API_KEY?.trim()
  const socialSetId = process.env.TYPEFULLY_SOCIAL_SET_ID?.trim()
  if (!apiKey || !socialSetId) {
    return NextResponse.json(
      { message: 'TYPEFULLY_API_KEY and TYPEFULLY_SOCIAL_SET_ID required' },
      { status: 503 }
    )
  }

  const limit = 30
  let offset = 0
  let scanned = 0
  let synced = 0
  const touchedIssues = new Set<number>()

  while (true) {
    const batch = await listTypefullyDraftsPage(socialSetId, apiKey, offset, limit)
    if (batch.length === 0) break

    for (const d of batch) {
      scanned++
      if (d.status !== 'published') continue

      let full = d
      if (!d.scratchpad_text?.trim()) {
        const detail = await getTypefullyDraft(socialSetId, apiKey, d.id)
        if (detail) full = detail
      }

      const result = await applyTypefullyPublishedLinksToGithubIssue({
        id: full.id,
        social_set_id: full.social_set_id,
        scratchpad_text: full.scratchpad_text,
        status: full.status,
        x_published_url: full.x_published_url,
        linkedin_published_url: full.linkedin_published_url,
        threads_published_url: full.threads_published_url,
        bluesky_published_url: full.bluesky_published_url,
        mastodon_published_url: full.mastodon_published_url,
      })

      if (result.ok && result.updated) {
        synced++
        touchedIssues.add(result.issueNumber)
      }
    }

    offset += batch.length
    if (batch.length < limit) break
  }

  if (touchedIssues.size > 0) {
    revalidateTag(GITHUB_NOTES_CACHE_TAG, 'default')
    revalidatePath('/notes')
    const nums = Array.from(touchedIssues)
    for (let i = 0; i < nums.length; i++) {
      revalidatePath(`/notes/${nums[i]}`)
    }
  }

  return NextResponse.json({
    ok: true,
    scanned,
    updated_issues: synced,
    issue_numbers: Array.from(touchedIssues),
  })
}
