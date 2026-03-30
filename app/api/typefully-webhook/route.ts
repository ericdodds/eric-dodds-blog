import { revalidatePath, revalidateTag } from 'next/cache'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  applyTypefullyPublishedLinksToGithubIssue,
  type TypefullyDraftPublishedData,
} from 'app/lib/apply-typefully-published-links'
import { GITHUB_NOTES_CACHE_TAG } from 'app/lib/github-notes'

/**
 * Typefully outbound webhooks (docs do not specify a standard signature format).
 * Set TYPEFULLY_WEBHOOK_SECRET and send the same value as:
 * - Authorization: Bearer <secret>, or
 * - X-Typefully-Webhook-Secret: <secret>
 */
function verifyTypefullyWebhook(request: Request): boolean {
  const secret = process.env.TYPEFULLY_WEBHOOK_SECRET?.trim()
  if (!secret) return false

  const auth = request.headers.get('authorization')
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  try {
    if (bearer) {
      const a = Buffer.from(bearer)
      const b = Buffer.from(secret)
      if (a.length === b.length && timingSafeEqual(a, b)) return true
    }
  } catch {
    /* invalid */
  }

  const header = request.headers.get('x-typefully-webhook-secret')
  try {
    if (header) {
      const a = Buffer.from(header.trim())
      const b = Buffer.from(secret)
      if (a.length === b.length && timingSafeEqual(a, b)) return true
    }
  } catch {
    /* invalid */
  }

  return false
}

type WebhookPayload = {
  event?: string
  data?: TypefullyDraftPublishedData
}

export async function POST(request: Request) {
  if (!process.env.TYPEFULLY_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json(
      { message: 'TYPEFULLY_WEBHOOK_SECRET is not configured' },
      { status: 503 }
    )
  }

  if (!verifyTypefullyWebhook(request)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = (await request.json()) as WebhookPayload
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 })
  }

  if (payload.event !== 'draft.published') {
    return NextResponse.json({ ok: true, ignored: payload.event ?? 'unknown' })
  }

  const data = payload.data
  if (!data?.id || data.social_set_id == null) {
    return NextResponse.json({ message: 'Missing draft data' }, { status: 400 })
  }

  const result = await applyTypefullyPublishedLinksToGithubIssue(data)

  if (!result.ok) {
    console.warn('[typefully-webhook] did not update issue:', result.reason)
    const status = result.reason.startsWith('GitHub PATCH') ? 502 : 400
    return NextResponse.json({ ok: false, error: result.reason }, { status })
  }

  if (result.updated) {
    revalidateTag(GITHUB_NOTES_CACHE_TAG, 'default')
    revalidatePath('/notes')
    revalidatePath(`/notes/${result.issueNumber}`)
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
