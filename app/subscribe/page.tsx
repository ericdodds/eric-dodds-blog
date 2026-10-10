import type { Metadata } from 'next'
import SubscribeForm from 'app/components/SubscribeForm'

export const metadata: Metadata = {
  title: 'Subscribe',
  description: 'Get an email when Eric Dodds publishes a new post.',
}

export default function SubscribePage() {
  return (
    <section>
      <h1 className="title font-semibold text-2xl tracking-tighter mb-8">Subscribe</h1>
      <p className="mb-8">
        Get an email when I publish a new post. I write about writing, AI, technology, productivity, and business.
      </p>

      <SubscribeForm source="subscribe_page" />
    </section>
  )
}
