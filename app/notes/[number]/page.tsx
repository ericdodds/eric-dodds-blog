import { notFound } from 'next/navigation'
import { cacheTag } from 'next/cache'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import {
  GITHUB_NOTES_CACHE_TAG,
  applyNotesCacheLife,
  getNoteByNumber,
  getNotes,
} from 'app/lib/github-notes'
import { resolveNoteBodyWithIssueHtml } from 'app/lib/github-issue-body-html'
import { noteMdxComponents } from 'app/lib/note-mdx-components'
import { remarkGithubNoteImages, rehypeGithubNoteImages } from 'app/lib/github-note-images-mdx'
import { rehypeEmbedUnwrap } from 'app/lib/rehype-embed-unwrap'
import { formatDate } from 'app/blog/utils'
import { baseUrl } from 'app/sitemap'

// Prerender all known notes at build so first visits don't block on GitHub.
// Unknown numbers still render on demand (dynamicParams defaults to true).
// Cache Components requires at least one param at build, so when GitHub is
// unavailable (e.g. no local token) fall back to '0' — issue numbers start
// at 1, so /notes/0 is a permanently valid 404.
export async function generateStaticParams() {
  try {
    const notes = await getNotes()
    if (notes.length > 0) {
      return notes.map((note) => ({ number: String(note.number) }))
    }
  } catch {
    // fall through to sentinel
  }
  return [{ number: '0' }]
}

function noteExcerpt(body: string | null, max = 160): string {
  if (!body) return ''
  const plain = body.replace(/\s+/g, ' ').trim()
  return plain.length > max ? plain.slice(0, max) + '…' : plain
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  const { number: numberParam } = await params
  const num = Number(numberParam)
  if (!Number.isFinite(num)) return { title: 'Note' }

  const note = await getNoteByNumber(num)
  if (!note) return { title: 'Note' }

  return {
    title: note.title,
    description: noteExcerpt(note.body, 300),
    openGraph: {
      title: note.title,
      description: noteExcerpt(note.body, 300),
      type: 'article',
      url: `${baseUrl}/notes/${note.number}`,
    },
  }
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ number: string }>
}) {
  // Cached as a whole page (like blog posts) rather than streamed behind
  // Suspense: notFound() must run before any shell is sent so unknown note
  // numbers return a real 404 status, not a 200 shell with a client-side 404.
  // Tagged per-note so the GitHub webhook invalidates it on edits.
  'use cache'

  const { number: numberParam } = await params
  const num = Number(numberParam)
  if (!Number.isFinite(num)) notFound()

  cacheTag(GITHUB_NOTES_CACHE_TAG, `note-${num}`)
  applyNotesCacheLife()

  const note = await getNoteByNumber(num)
  if (!note) notFound()

  const mdxSource = await resolveNoteBodyWithIssueHtml(note.body, note.number)

  return (
    <section>
      <h1 className="title font-semibold text-2xl tracking-tighter text-neutral-950 dark:text-white">
        {note.title}
      </h1>
      <div className="flex justify-between items-center mt-2 mb-4 text-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(note.created_at)}
          <span aria-hidden className="mx-1.5 text-neutral-400 dark:text-neutral-500">
            ·
          </span>
          <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
            Eric Dodds Weblog
          </Link>
          <span aria-hidden className="mx-1.5 text-neutral-400 dark:text-neutral-500">
            ·
          </span>
          <Link
            href="/notes"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            Notes
          </Link>
        </p>
      </div>
      <article className="prose">
        <MDXRemote
          source={mdxSource}
          components={noteMdxComponents}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm, remarkGithubNoteImages],
              rehypePlugins: [rehypeGithubNoteImages, rehypeSlug, rehypeEmbedUnwrap],
            },
          }}
        />
      </article>
      <p className="mt-10 text-sm text-neutral-600 dark:text-neutral-400">
        <a
          href={note.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 decoration-neutral-400 dark:decoration-neutral-600"
        >
          View and comment on GitHub
        </a>
      </p>
    </section>
  )
}
