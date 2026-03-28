import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { getNotes } from 'app/lib/github-notes'
import { resolveNoteBodyWithIssueHtml } from 'app/lib/github-issue-body-html'
import { noteMdxComponents } from 'app/lib/note-mdx-components'
import { remarkGithubNoteImages, rehypeGithubNoteImages } from 'app/lib/github-note-images-mdx'
import { formatDate } from 'app/blog/utils'

export const metadata = {
  title: 'Notes',
  description: 'Short notes and links, published via GitHub Issues.',
}

export const revalidate = 3600

export default async function NotesPage() {
  const notes = await getNotes()
  const notesResolved = await Promise.all(
    notes.map(async (note) => ({
      ...note,
      mdxSource: await resolveNoteBodyWithIssueHtml(note.body, note.number),
    }))
  )
  const missingConfig = !process.env.NOTES_GITHUB_REPO?.trim() || !process.env.GITHUB_TOKEN?.trim()
  const publishLabel = process.env.NOTES_PUBLISH_LABEL?.trim()

  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Eric Dodds Notebook</h1>
      {missingConfig ? (
        <p className="text-neutral-600 dark:text-neutral-400 text-sm">
          Notes are not configured. Set <code className="text-xs">NOTES_GITHUB_REPO</code> and{' '}
          <code className="text-xs">GITHUB_TOKEN</code> in <code className="text-xs">.env.local</code> for
          local dev (same values as Vercel), then restart <code className="text-xs">next dev</code>.
        </p>
      ) : notes.length === 0 ? (
        <div className="text-neutral-600 dark:text-neutral-400 space-y-3 text-sm">
          <p>No notes match the current filters. Check that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              The issue is in the repo <code className="text-xs">{process.env.NOTES_GITHUB_REPO}</code>, not
              another project.
            </li>
            <li>The issue is <strong>open</strong> (closed issues are hidden).</li>
            <li>It is a normal issue, not a pull request.</li>
            {publishLabel ? (
              <li>
                The issue has the GitHub label <code className="text-xs">{publishLabel}</code> (
                <code className="text-xs">NOTES_PUBLISH_LABEL</code> is set).
              </li>
            ) : null}
          </ul>
          {process.env.NODE_ENV === 'production' ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              After <code className="text-xs">next build</code>, new issues appear when ISR refreshes (up to
              about an hour) or when your GitHub webhook calls{' '}
              <code className="text-xs">/api/revalidate-notes</code>.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {notesResolved.map((note) => (
            <article key={note.id} className="border-b border-neutral-200 dark:border-neutral-800 pb-8 last:border-0">
              <h2 className="text-lg font-semibold tracking-tight mb-1">
                <Link
                  href={`/notes/${note.number}`}
                  className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  {note.title}
                </Link>
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 tabular-nums">
                {formatDate(note.created_at)}
              </p>
              <div className="prose">
                <MDXRemote
                  source={note.mdxSource}
                  components={noteMdxComponents}
                  options={{
                    mdxOptions: {
                      remarkPlugins: [remarkGfm, remarkGithubNoteImages],
                      rehypePlugins: [rehypeGithubNoteImages, rehypeSlug],
                    },
                  }}
                />
              </div>
              <p className="mt-6 text-sm">
                <Link
                  href={`/notes/${note.number}`}
                  className="underline underline-offset-2 decoration-neutral-400 dark:decoration-neutral-600"
                >
                  Permalink
                </Link>
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
