import Link from 'next/link'

const navItems = [
  {
    path: '/',
    name: 'home',
    icon: true,
  },
  {
    path: '/blog',
    name: 'blog',
  },
  {
    path: '/notes',
    name: 'notes',
  },
  {
    path: '/about',
    name: 'about',
  },
  {
    path: 'https://tokenintelligenceshow.substack.com/',
    name: 'podcast',
  },
  {
    path: '/contact',
    name: 'contact',
  },
] as const

function DoddsLogo() {
  // Oversized bullet that reads as a dedicated "home" marker instead of
  // punctuation. `leading-none` keeps it on the text baseline without
  // inflating the nav height.
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center text-5xl leading-none -mt-1"
    >
      •
    </span>
  )
}

export function Navbar() {
  return (
    <aside className="mb-16 tracking-tight md:-ml-[8px] w-full min-w-0 max-w-full">
      <div className="lg:sticky lg:top-20 w-full min-w-0 max-w-full">
        <nav
          className="flex w-full min-w-0 max-w-full flex-row items-start relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative"
          id="nav"
        >
          <div className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-x-1 gap-y-1 pr-4 md:gap-x-1.5 md:pr-10">
            {navItems.map(({ path, name, icon }) => (
              <Link
                key={path}
                href={path}
                aria-label={icon ? name : undefined}
                className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 relative inline-flex items-center whitespace-nowrap py-2 px-1 md:py-1 md:px-1.5"
              >
                {icon ? <DoddsLogo /> : name}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  )
}
