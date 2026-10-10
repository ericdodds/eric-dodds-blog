'use client'

import { usePathname } from 'next/navigation'
import SubscribeForm from './SubscribeForm'

export default function FooterSubscribe() {
  const pathname = usePathname()
  if (pathname === '/subscribe') return null

  return (
    <section aria-labelledby="footer-subscribe" className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <h2 id="footer-subscribe" className="mb-2 font-semibold">Subscribe to new posts</h2>
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">Get an email when I publish something new.</p>
      <SubscribeForm source="footer" />
    </section>
  )
}
