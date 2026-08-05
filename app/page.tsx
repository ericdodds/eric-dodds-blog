import { BlogPosts, PopularPosts } from 'app/components/posts'
import Link from 'next/link'

// Posts featured in the "Popular" section of the homepage, in display order.
// Edit this list to change which posts appear.
const popularPostSlugs = [
  'ai-beyond-the-chat-interface',
  'street-poet-postscript-why-ai-can-feel-cheap',
  'ai-makes-notion-hubspots-biggest-threat',
]

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        Eric Dodds Weblog
      </h1>
      <p className="mb-4">
        {`My name is Eric Dodds. I'm a Christian, husband, father, writer, and tech marketing leader, ideally in that order.`}
      </p>
      <p className="mb-4">
        This is my corner of the internet. You can read my{' '}
        <Link
          href="/blog"
          className="underline transition-all decoration-neutral-400 dark:decoration-neutral-600 underline-offset-2 decoration-[0.1em]"
        >
          long-form writing
        </Link>
        , browse thoughts in my{' '}
        <Link
          href="/notes"
          className="underline transition-all decoration-neutral-400 dark:decoration-neutral-600 underline-offset-2 decoration-[0.1em]"
        >
          notebook
        </Link>
        ,{' '}
        <Link
          href="/about"
          className="underline transition-all decoration-neutral-400 dark:decoration-neutral-600 underline-offset-2 decoration-[0.1em]"
        >
          learn more about me
        </Link>
        , or{' '}
        <Link
          href="/contact"
          className="underline transition-all decoration-neutral-400 dark:decoration-neutral-600 underline-offset-2 decoration-[0.1em]"
        >
          reach out
        </Link>{' '}
        to say hello.
      </p>
      <hr className="my-8 border-0 border-t border-neutral-200 dark:border-neutral-800" />
      <div>
        <h2 className="mb-4 text-xl font-semibold tracking-tighter">
          Popular blog posts
        </h2>
        <PopularPosts slugs={popularPostSlugs} />
      </div>
      <hr className="my-8 border-0 border-t border-neutral-200 dark:border-neutral-800" />
      <div>
        <h2 className="mb-4 text-xl font-semibold tracking-tighter">
          Recent blog posts
        </h2>
        <BlogPosts limit={5} />
        <Link
          href="/blog"
          className="mt-4 inline-block text-sm text-neutral-600 underline decoration-neutral-400 underline-offset-2 dark:text-neutral-400 dark:decoration-neutral-600"
        >
          View all
        </Link>
      </div>
    </section>
  )
}
