import { getNoteByNumber, hasQuotePostedLabel } from 'app/lib/github-notes'
import { createTypefullyDraftFromIssue } from 'app/lib/typefully-sync'

export type PushNoteToTypefullyResult =
  | { ran: false; reason: 'typefully_env_missing' | 'note_not_found' | 'quote_posted_label' }
  | { ran: true; ok: true; draftId: number; privateUrl?: string }
  | { ran: true; ok: false; error: string }

/**
 * Load the note the same way /notes does, then create a Typefully draft.
 * Webhook invokes this only on initial note visibility (opened / reopened / labeled).
 * Use `bypassDataCache` so the draft matches GitHub right after the event.
 * Notes labeled `x-quote-posted` never go to Typefully — the quote is already live on X.
 */
export async function pushPublishedNoteToTypefully(
  issueNumber: number
): Promise<PushNoteToTypefullyResult> {
  if (!process.env.TYPEFULLY_API_KEY?.trim() || !process.env.TYPEFULLY_SOCIAL_SET_ID?.trim()) {
    return { ran: false, reason: 'typefully_env_missing' }
  }

  const note = await getNoteByNumber(issueNumber, { bypassDataCache: true })
  if (!note) {
    return { ran: false, reason: 'note_not_found' }
  }

  if (hasQuotePostedLabel(note.labels)) {
    return { ran: false, reason: 'quote_posted_label' }
  }

  const result = await createTypefullyDraftFromIssue({
    number: note.number,
    title: note.title,
    body: note.body,
    html_url: note.html_url,
    labels: note.labels,
  })

  if (!result.ok) {
    return { ran: true, ok: false, error: result.reason }
  }

  return { ran: true, ok: true, draftId: result.draftId, privateUrl: result.privateUrl }
}
