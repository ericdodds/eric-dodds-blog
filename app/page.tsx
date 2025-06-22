import { BlogPosts } from 'app/components/posts'
import Link from 'next/link'

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        Eric Dodds Weblog
      </h1>
      <p className="mb-4">
        {`My name is Eric Dodds. I'm a Christian, husband, father and tech product leader.`}
      </p>
      <p className="mb-4">
        This is my corner of the internet. You can read my{' '}
        <Link
          href="/blog"
          className="underline transition-all decoration-neutral-400 dark:decoration-neutral-600 underline-offset-2 decoration-[0.1em]"
        >
          writing
        </Link>
        , learn more{' '}
        <Link
          href="/about"
          className="underline transition-all decoration-neutral-400 dark:decoration-neutral-600 underline-offset-2 decoration-[0.1em]"
        >
          about me
        </Link>
        {' '}or{' '}
        <Link
          href="/contact"
          className="underline transition-all decoration-neutral-400 dark:decoration-neutral-600 underline-offset-2 decoration-[0.1em]"
        >
          reach out
        </Link>{' '}
        to say hello.
      </p>
      <hr></hr>
      <div className="my-8">
        <h2 className="mb-4 text-xl font-semibold tracking-tighter">
          Recent blog posts
        </h2>
        <BlogPosts limit={5} />
      </div>
    </section>
  )
}
