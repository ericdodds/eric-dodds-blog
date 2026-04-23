import { revalidatePath, revalidateTag } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { GITHUB_NOTES_CACHE_TAG, getNotesGitHubRepo } from 'app/lib/github-notes'
import {
  fetchGithubIssueForPatch,
  patchGithubIssueBody,
} from 'app/lib/github-issues-write'
import { computeQuoteExpansion } from 'app/lib/x-quote-expansion'

/** Syndication fetch + PATCH round-trip can exceed default serverless limits. */
export const maxDuration = 30

function verifySyncSecret(request: Request): boolean {
  const expected = process.env.TYPEFULLY_SYNC_SECRET?.trim()
  if (!expected) return false
  const auth = request.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return false
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

type Body = { issue_number?: number; number?: number }

/**
 * Manual trigger: expand an already-posted X quote into a notes GitHub issue.
 *
 * POST /api/expand-x-quote
 * Authorization: Bearer <TYPEFULLY_SYNC_SECRET>
 * Body: { "issue_number": 123 }
 *
 * Useful for backfilling notes created before this feature existed or when
 * re-running expansion after editing the quote-post URL in the issue body.
 */
export async function POST(request: Request) {
  if (!process.env.TYPEFULLY_SYNC_SECRET?.trim()) {
    return NextResponse.json(
      { message: 'TYPEFULLY_SYNC_SECRET is not configured' },
      { status: 503 }
    )
  }
  if (!verifySyncSecret(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  }

  const issueNumber = body.issue_number ?? body.number
  if (!Number.isFinite(issueNumber) || typeof issueNumber !== 'number') {
    return NextResponse.json(
      { message: 'Expected JSON body: { "issue_number": <number> }' },
      { status: 400 }
    )
  }

  const repo = getNotesGitHubRepo()
  if (!repo) {
    return NextResponse.json(
      { message: 'NOTES_GITHUB_REPO is not configured' },
      { status: 503 }
    )
  }

  const meta = await fetchGithubIssueForPatch(repo.owner, repo.repo, issueNumber)
  if (!meta) {
    return NextResponse.json(
      { message: 'Could not load GitHub issue' },
      { status: 404 }
    )
  }

  const result = await computeQuoteExpansion(meta.body)
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason, note_number: issueNumber },
      { status: 422 }
    )
  }

  if (!result.changed) {
    return NextResponse.json({
      ok: true,
      updated: false,
      note_number: issueNumber,
      tweet_id: result.quoteTweetId,
    })
  }

  const patched = await patchGithubIssueBody(
    repo.owner,
    repo.repo,
    issueNumber,
    result.nextBody
  )
  if (!patched.ok) {
    return NextResponse.json(
      { ok: false, reason: `GitHub PATCH ${patched.status}: ${patched.message}` },
      { status: 502 }
    )
  }

  revalidateTag(GITHUB_NOTES_CACHE_TAG, 'default')
  revalidatePath('/notes')
  revalidatePath(`/notes/${issueNumber}`)

  return NextResponse.json({
    ok: true,
    updated: true,
    note_number: issueNumber,
    tweet_id: result.quoteTweetId,
  })
}
