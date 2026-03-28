import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { pushPublishedNoteToTypefully } from 'app/lib/push-note-to-typefully'

/**
 * Image upload + media polling + draft POST can exceed default function limits on Vercel.
 */
export const maxDuration = 60

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
 * Manual or CI: create a Typefully draft from the same note data as /notes.
 *
 * POST /api/sync-typefully
 * Authorization: Bearer <TYPEFULLY_SYNC_SECRET>
 * Body: { "issue_number": 123 } (or { "number": 123 })
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

  const push = await pushPublishedNoteToTypefully(issueNumber)

  if (!push.ran && push.reason === 'typefully_env_missing') {
    return NextResponse.json(
      { message: 'TYPEFULLY_API_KEY and TYPEFULLY_SOCIAL_SET_ID must be set' },
      { status: 503 }
    )
  }

  if (!push.ran && push.reason === 'note_not_found') {
    return NextResponse.json(
      { message: 'Note not found or not published under current CMS filters' },
      { status: 404 }
    )
  }

  if (push.ran && !push.ok) {
    console.error('[typefully] sync-typefully failed:', push.error)
    return NextResponse.json({ ok: false, error: push.error }, { status: 502 })
  }

  if (push.ran && push.ok) {
    console.log('[typefully] draft via sync-typefully', push.draftId, push.privateUrl ?? '')
    return NextResponse.json({
      ok: true,
      draft_id: push.draftId,
      private_url: push.privateUrl,
      note_number: issueNumber,
    })
  }
}
