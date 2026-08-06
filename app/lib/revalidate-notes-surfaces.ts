import { revalidatePath, revalidateTag } from 'next/cache'
import { GITHUB_NOTES_CACHE_TAG } from 'app/lib/github-notes'

/**
 * Invalidate every surface that renders notes data. Used by all note writers
 * (GitHub webhook, cron sync, Typefully webhook, x-quote expansion) so none
 * of them forgets a surface — /writing and the sitemap consume getNotes()
 * too, not just the /notes pages.
 */
export function revalidateNotesSurfaces(issueNumbers: Iterable<number> = []) {
  revalidateTag(GITHUB_NOTES_CACHE_TAG, 'default')
  revalidatePath('/notes')
  revalidatePath('/writing')
  revalidatePath('/sitemap.xml')
  for (const n of Array.from(issueNumbers)) {
    if (Number.isFinite(n)) {
      revalidatePath(`/notes/${n}`)
    }
  }
}
