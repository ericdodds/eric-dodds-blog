import { Suspense } from 'react'
import Link from 'next/link'
import { BlogPosts } from 'app/components/posts'
import { RecentNotesFallback } from './recent-notes-fallback'
import { RecentNotesSection } from './recent-notes'

export const metadata = {
  title: 'Writing',
  description: 'Long-form posts and short notes from Eric Dodds.',
}

export const revalidate = 3600

export default function WritingPage() {
  return (
    <section>
      <h1 className="title font-semibold text-2xl tracking-tighter">Writing</h1>
      <div className="mt-8 space-y-10">
        <p className="text-neutral-600 dark:text-neutral-400 [&_a]:underline [&_a]:transition-all [&_a]:decoration-neutral-400 dark:[&_a]:decoration-neutral-600 [&_a]:underline-offset-2 [&_a]:decoration-[0.1em]">
          I regularly write long-form essays on my blog. Notes are my playground for short-form thoughts and ideas, some of which I post to X and LinkedIn. I also write regularly on the{' '}
          <a href="https://vercel.com/blog" target="_blank" rel="noopener noreferrer">
            Vercel blog
          </a>
          .
        </p>

        <div>
          <h2 className="title mb-4 text-xl font-semibold tracking-tighter">
            Blog posts
          </h2>
          <BlogPosts limit={5} />
          <Link
            href="/blog"
            className="mt-4 inline-block text-sm text-neutral-600 underline decoration-neutral-400 underline-offset-2 dark:text-neutral-400 dark:decoration-neutral-600"
          >
            View all
          </Link>
        </div>

        <div>
          <h2 className="title mb-4 text-xl font-semibold tracking-tighter">Notes</h2>
          <Suspense fallback={<RecentNotesFallback />}>
            <RecentNotesSection />
          </Suspense>
          <Link
            href="/notes"
            className="mt-4 inline-block text-sm text-neutral-600 underline decoration-neutral-400 underline-offset-2 dark:text-neutral-400 dark:decoration-neutral-600"
          >
            View all
          </Link>
        </div>
      </div>
    </section>
  )
}
