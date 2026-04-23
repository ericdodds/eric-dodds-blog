import { revalidatePath, revalidateTag } from 'next/cache'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  GITHUB_NOTES_CACHE_TAG,
  hasQuotePostedLabel,
  issueIsVisibleAsNote,
  type GitHubWebhookIssue,
} from 'app/lib/github-notes'
import { pushPublishedNoteToTypefully } from 'app/lib/push-note-to-typefully'
import {
  fetchGithubIssueForPatch,
  patchGithubIssueBody,
} from 'app/lib/github-issues-write'
import { computeQuoteExpansion } from 'app/lib/x-quote-expansion'

/** Allow Typefully image upload + draft POST after revalidate. */
export const maxDuration = 60

type GitHubIssuesPayload = {
  action: string
  repository?: { full_name?: string }
  issue?: GitHubWebhookIssue
  label?: { name: string }
}

function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !signature.startsWith('sha256=')) return false
  const expected =
    'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * One Typefully draft when the note first becomes visible on the site — same rules as /notes.
 * Triggers on `opened` / `reopened` (without draft label), `labeled` (publish label added),
 * or `unlabeled` (draft label removed). GitHub `edited` does not sync (further edits are
 * meant to happen in Typefully). Content comes from `getNoteByNumber`.
 */
function shouldPushTypefullyOnInitialPublish(
  payload: GitHubIssuesPayload
): payload is GitHubIssuesPayload & { issue: GitHubWebhookIssue } {
  if (!process.env.TYPEFULLY_API_KEY?.trim() || !process.env.TYPEFULLY_SOCIAL_SET_ID?.trim()) {
    return false
  }

  const issue = payload.issue
  if (!issue) return false

  // `x-quote-posted` means the quote is already live on X — never re-post via Typefully.
  if (hasQuotePostedLabel(issue.labels)) return false

  const publishLabel = process.env.NOTES_PUBLISH_LABEL?.trim()
  const draftLabel = process.env.NOTES_DRAFT_LABEL?.trim()

  // Draft label is a hard blocker — never push if it's still present.
  if (draftLabel && issue.labels?.some((l) => l.name === draftLabel)) return false

  if (publishLabel) {
    // "published" label just added
    if (payload.action === 'labeled' && payload.label?.name === publishLabel) {
      return issueIsVisibleAsNote(issue)
    }
    // "draft" label just removed while "published" is already present
    if (
      payload.action === 'unlabeled' &&
      draftLabel &&
      payload.label?.name === draftLabel &&
      issue.labels?.some((l) => l.name === publishLabel)
    ) {
      return issueIsVisibleAsNote(issue)
    }
    if (
      (payload.action === 'opened' || payload.action === 'reopened') &&
      issue.labels?.some((l) => l.name === publishLabel)
    ) {
      return issueIsVisibleAsNote(issue)
    }
    return false
  }

  // Draft-only workflow: "draft" label just removed → note becomes visible.
  if (
    payload.action === 'unlabeled' &&
    draftLabel &&
    payload.label?.name === draftLabel
  ) {
    return issueIsVisibleAsNote(issue)
  }

  if (payload.action !== 'opened' && payload.action !== 'reopened') return false
  return issueIsVisibleAsNote(issue)
}

/**
 * GitHub webhook: revalidate notes cache, then a single Typefully draft on initial publish
 * (opened / reopened / labeled per `shouldPushTypefullyOnInitialPublish`). Manual/backfill:
 * POST /api/sync-typefully with TYPEFULLY_SYNC_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ message: 'GITHUB_WEBHOOK_SECRET not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyGitHubSignature(rawBody, signature, secret)) {
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
  }

  let payload: GitHubIssuesPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  const expectedRepo = process.env.NOTES_GITHUB_REPO?.trim().toLowerCase()
  const actualRepo = payload.repository?.full_name?.toLowerCase()
  if (expectedRepo && actualRepo && actualRepo !== expectedRepo) {
    console.warn('[revalidate-notes] ignored webhook: repository mismatch', {
      expected: expectedRepo,
      actual: actualRepo,
    })
    return NextResponse.json({ ok: true, ignored: 'repository mismatch' })
  }

  revalidateTag(GITHUB_NOTES_CACHE_TAG, 'default')
  revalidatePath('/notes')
  const n = payload.issue?.number
  if (typeof n === 'number' && Number.isFinite(n)) {
    revalidatePath(`/notes/${n}`)
  }
  console.log('[revalidate-notes] cache cleared for /notes', {
    action: payload.action,
    issue: n,
    repo: actualRepo,
  })

  let typefully_synced = false
  let typefully_error: string | undefined
  let typefully_skip: string | undefined

  if (shouldPushTypefullyOnInitialPublish(payload)) {
    const push = await pushPublishedNoteToTypefully(payload.issue.number)
    if (push.ran && push.ok) {
      typefully_synced = true
      console.log('[typefully] draft after publish', push.draftId, push.privateUrl ?? '')
    } else if (push.ran && !push.ok) {
      typefully_error = push.error
      console.error('[typefully] draft failed after publish:', push.error)
    } else if (!push.ran && push.reason === 'note_not_found') {
      typefully_skip = 'note_not_visible_after_revalidate'
    } else if (!push.ran && push.reason === 'quote_posted_label') {
      typefully_skip = 'quote_posted_label'
    }
  } else if (
    process.env.TYPEFULLY_API_KEY?.trim() &&
    process.env.TYPEFULLY_SOCIAL_SET_ID?.trim() &&
    payload.issue &&
    ['opened', 'reopened', 'labeled', 'unlabeled'].includes(payload.action) &&
    !hasQuotePostedLabel(payload.issue.labels)
  ) {
    console.log('[typefully] skipped initial publish push', {
      action: payload.action,
      issue: payload.issue.number,
      noteVisible: issueIsVisibleAsNote(payload.issue),
    })
  }

  // If this issue is an "already posted on X" quote note, expand the quote-tweet
  // into the issue body (idempotent via `<!-- x-quote-source:* -->` marker).
  let x_quote_expanded: boolean | undefined
  let x_quote_expansion_error: string | undefined
  if (
    payload.issue &&
    hasQuotePostedLabel(payload.issue.labels) &&
    ['opened', 'reopened', 'labeled'].includes(payload.action) &&
    issueIsVisibleAsNote(payload.issue)
  ) {
    try {
      const notesRepo = process.env.NOTES_GITHUB_REPO?.trim().split('/') ?? []
      const owner = notesRepo[0]
      const repo = notesRepo[1]
      const issueNumber = payload.issue.number

      if (!owner || !repo) {
        x_quote_expansion_error = 'NOTES_GITHUB_REPO not configured'
      } else {
        const meta = await fetchGithubIssueForPatch(owner, repo, issueNumber)
        if (!meta) {
          x_quote_expansion_error = 'could not load GitHub issue for expansion'
        } else {
          const result = await computeQuoteExpansion(meta.body)
          if (!result.ok) {
            console.warn('[x-quote] expansion skipped:', result.reason, {
              issue: issueNumber,
            })
            x_quote_expansion_error = result.reason
          } else if (!result.changed) {
            console.log('[x-quote] expansion unchanged', { issue: issueNumber })
            x_quote_expanded = false
          } else {
            const patched = await patchGithubIssueBody(
              owner,
              repo,
              issueNumber,
              result.nextBody
            )
            if (!patched.ok) {
              x_quote_expansion_error = `GitHub PATCH ${patched.status}: ${patched.message}`
              console.error('[x-quote] PATCH failed:', x_quote_expansion_error)
            } else {
              x_quote_expanded = true
              revalidateTag(GITHUB_NOTES_CACHE_TAG, 'default')
              revalidatePath('/notes')
              revalidatePath(`/notes/${issueNumber}`)
              console.log('[x-quote] expanded quote into issue', {
                issue: issueNumber,
                tweetId: result.quoteTweetId,
              })
            }
          }
        }
      }
    } catch (err) {
      x_quote_expansion_error =
        err instanceof Error ? err.message : 'unknown expansion error'
      console.error('[x-quote] expansion threw:', x_quote_expansion_error)
    }
  }

  return NextResponse.json({
    revalidated: true,
    tag: GITHUB_NOTES_CACHE_TAG,
    github_action: payload.action,
    typefully_synced,
    typefully_skip,
    typefully_error: typefully_error?.slice(0, 400),
    x_quote_expanded,
    x_quote_expansion_error: x_quote_expansion_error?.slice(0, 400),
  })
}
