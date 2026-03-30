import {
  buildNoteSocialBlock,
  collectPublishedPlatformLinks,
  mergeSocialBlockIntoIssueBody,
  parseGithubIssueRefFromScratchpad,
} from 'app/lib/note-social-block'
import {
  fetchGithubIssueForPatch,
  notesRepoMatchesRef,
  patchGithubIssueBody,
} from 'app/lib/github-issues-write'

export type TypefullyDraftPublishedData = {
  id: number
  social_set_id: number
  scratchpad_text?: string | null
  status?: string | null
  x_published_url?: string | null
  linkedin_published_url?: string | null
  threads_published_url?: string | null
  bluesky_published_url?: string | null
  mastodon_published_url?: string | null
}

export type ApplyPublishedLinksResult =
  | { ok: true; issueNumber: number; updated: boolean; skipReason?: string }
  | { ok: false; reason: string }

/**
 * Idempotent: PATCHes the notes issue only when the merged social block differs.
 */
export async function applyTypefullyPublishedLinksToGithubIssue(
  data: TypefullyDraftPublishedData
): Promise<ApplyPublishedLinksResult> {
  const expectedSet = process.env.TYPEFULLY_SOCIAL_SET_ID?.trim()
  if (expectedSet && String(data.social_set_id) !== expectedSet) {
    return { ok: false, reason: 'social_set_id mismatch' }
  }

  const ref = parseGithubIssueRefFromScratchpad(data.scratchpad_text)
  if (!ref) {
    return { ok: false, reason: 'scratchpad missing Source: github issue URL' }
  }

  if (!notesRepoMatchesRef(ref.owner, ref.repo)) {
    return { ok: false, reason: 'issue URL does not match NOTES_GITHUB_REPO' }
  }

  const links = collectPublishedPlatformLinks(data)
  const block = buildNoteSocialBlock(data.id, links)

  const meta = await fetchGithubIssueForPatch(ref.owner, ref.repo, ref.number)
  if (!meta) {
    return { ok: false, reason: 'could not load GitHub issue' }
  }

  const nextBody = mergeSocialBlockIntoIssueBody(meta.body, block)
  if (nextBody === (meta.body ?? '')) {
    return { ok: true, issueNumber: ref.number, updated: false, skipReason: 'body unchanged' }
  }

  const patched = await patchGithubIssueBody(ref.owner, ref.repo, ref.number, nextBody)
  if (!patched.ok) {
    return {
      ok: false,
      reason: `GitHub PATCH ${patched.status}: ${patched.message}`,
    }
  }

  return { ok: true, issueNumber: ref.number, updated: true }
}
