import { getNoteByNumber } from 'app/lib/github-notes'
import { createTypefullyDraftFromIssue } from 'app/lib/typefully-sync'

export type PushNoteToTypefullyResult =
  | { ran: false; reason: 'typefully_env_missing' | 'note_not_found' }
  | { ran: true; ok: true; draftId: number; privateUrl?: string }
  | { ran: true; ok: false; error: string }

/**
 * Load the note the same way /notes does, then create a Typefully draft.
 * Use `bypassDataCache` on read so a webhook right after an edit sees fresh GitHub data.
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

  const result = await createTypefullyDraftFromIssue({
    number: note.number,
    title: note.title,
    body: note.body,
    html_url: note.html_url,
  })

  if (!result.ok) {
    return { ran: true, ok: false, error: result.reason }
  }

  return { ran: true, ok: true, draftId: result.draftId, privateUrl: result.privateUrl }
}
