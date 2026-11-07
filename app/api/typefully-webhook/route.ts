import { NextResponse } from 'next/server'
import {
  applyTypefullyPublishedLinksToGithubIssue,
  type TypefullyDraftPublishedData,
} from 'app/lib/apply-typefully-published-links'
import { revalidateNotesSurfaces } from 'app/lib/revalidate-notes-surfaces'
import { verifyTypefullyWebhook } from 'app/lib/typefully-webhook'
import { parseGithubIssueRefFromScratchpad } from 'app/lib/note-social-block'

type WebhookPayload = {
  event?: string
  data?: TypefullyDraftPublishedData
}

export async function POST(request: Request) {
  const secret = process.env.TYPEFULLY_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return NextResponse.json(
      { message: 'TYPEFULLY_WEBHOOK_SECRET is not configured' },
      { status: 503 }
    )
  }

  const body = await request.text()
  if (!verifyTypefullyWebhook(body, request.headers, secret)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(body) as WebhookPayload
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })
  }

  if (payload.event !== 'draft.published') {
    return NextResponse.json({ ok: true, ignored: payload.event ?? 'unknown' })
  }

  const data = payload.data
  if (!data?.id || data.social_set_id == null) {
    return NextResponse.json({ message: 'Missing draft data' }, { status: 400 })
  }

  const expectedSet = process.env.TYPEFULLY_SOCIAL_SET_ID?.trim()
  if (!expectedSet) {
    return NextResponse.json(
      { message: 'TYPEFULLY_SOCIAL_SET_ID is not configured' },
      { status: 503 }
    )
  }
  // Team webhooks include other social sets after accounts are combined.
  if (String(data.social_set_id) !== expectedSet) {
    return NextResponse.json({ ok: true, updated: false, skip_reason: 'different social set' })
  }

  // Drafts created directly in Typefully need not be linked to a Notes issue.
  // Acknowledge them so normal publishing does not cause retries/auto-disable.
  if (!parseGithubIssueRefFromScratchpad(data.scratchpad_text)) {
    return NextResponse.json({ ok: true, updated: false, skip_reason: 'not a note draft' })
  }

  const result = await applyTypefullyPublishedLinksToGithubIssue(data)

  if (!result.ok) {
    console.warn('[typefully-webhook] did not update issue:', result.reason)
    const status = result.reason.startsWith('GitHub PATCH') ? 502 : 400
    return NextResponse.json({ ok: false, error: result.reason }, { status })
  }

  if (result.updated) {
    revalidateNotesSurfaces([result.issueNumber])
    console.log('[typefully-webhook] updated note social links', {
      issue: result.issueNumber,
      draftId: data.id,
    })
  }

  return NextResponse.json({
    ok: true,
    issue: result.issueNumber,
    updated: result.updated,
    skip_reason: result.skipReason,
  })
}
