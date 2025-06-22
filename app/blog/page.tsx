import { BlogPosts } from 'app/components/posts'

export const metadata = {
  title: 'Eric Dodds Weblog',
  description: 'Read the latest from Eric Dodds.',
}

export default function Page() {
  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Eric Dodds Weblog</h1>
      <BlogPosts />
    </section>
  )
}
