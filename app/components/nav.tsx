import Link from 'next/link'

const navItems = {
  '/': {
    name: 'home',
  },
  '/blog': {
    name: 'blog',
  },
  '/notes': {
    name: 'notes',
  },
  '/about': {
    name: 'about',
  },
  'https://tokenintelligenceshow.substack.com/': {
    name: 'podcast',
  },
  '/contact': {
    name: 'contact',
  },
}

export function Navbar() {
  return (
    <aside className="mb-16 tracking-tight md:-ml-[8px] w-full min-w-0 max-w-full">
      <div className="lg:sticky lg:top-20 w-full min-w-0 max-w-full">
        <nav
          className="flex w-full min-w-0 max-w-full flex-row items-start relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative"
          id="nav"
        >
          <div className="flex w-full min-w-0 max-w-full flex-wrap gap-x-1.5 gap-y-1 pr-4 md:gap-x-2 md:pr-10">
            {Object.entries(navItems).map(([path, { name }]) => {
              return (
                <Link
                  key={path}
                  href={path}
                  className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 relative inline-flex items-center whitespace-nowrap py-2 px-1.5 md:py-1 md:px-2"
                >
                  {name}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </aside>
  )
}
