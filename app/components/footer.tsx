import { cacheLife } from 'next/cache'
import SubscribeForm from './SubscribeForm'

function ArrowIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.07102 11.3494L0.963068 10.2415L9.2017 1.98864H2.83807L2.85227 0.454545H11.8438V9.46023H10.2955L10.3097 3.09659L2.07102 11.3494Z"
        fill="currentColor"
      />
    </svg>
  )
}

// new Date() is an unstable prerender value under Cache Components; cache it
// day-scale so the year is computed in a cache scope and stays current.
async function copyrightYear(): Promise<number> {
  'use cache'
  cacheLife('days')
  return new Date().getFullYear()
}

export default async function Footer() {
  const year = await copyrightYear()
  return (
    <footer className="mb-16">
      <section aria-labelledby="footer-subscribe" className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <h2 id="footer-subscribe" className="mb-2 font-semibold">Subscribe to new posts</h2>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">Get an email when I publish something new.</p>
        <SubscribeForm />
      </section>
      <ul className="font-sm mt-8 flex flex-col space-x-0 space-y-2 text-neutral-600 md:flex-row md:space-x-4 md:space-y-0 dark:text-neutral-300">
        <li>
          <a
            className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
            rel="noopener noreferrer"
            target="_blank"
            href="/rss"
          >
            <ArrowIcon />
            <p className="ml-2 h-7">rss</p>
          </a>
        </li>
        {/* <li>
          <a
            className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
            rel="noopener noreferrer"
            target="_blank"
            href="https://github.com/vercel/next.js"
          >
            <ArrowIcon />
            <p className="ml-2 h-7">github</p>
          </a>
        </li> */}
        <li>
          <a
            className="flex items-center transition-all hover:text-neutral-800 dark:hover:text-neutral-100"
            rel="noopener noreferrer"
            target="_blank"
            href="https://github.com/ericdodds/eric-dodds-blog"
          >
            <ArrowIcon />
            <p className="ml-2 h-7">view source</p>
          </a>
        </li>
      </ul>
      <p className="mt-8 text-neutral-600 dark:text-neutral-300">
        © {year} Eric Dodds
      </p>
    </footer>
  )
}
