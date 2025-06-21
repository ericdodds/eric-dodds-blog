import { BlogPosts } from 'app/components/posts'

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        Eric Dodds Weblog
      </h1>
      <p className="mb-4">
        {`My name is Eric Dodds. I'm a Christian, husband, father and tech product leader. This is my weblog. `}
      </p>
      <hr></hr>
      <div className="my-8">
        <BlogPosts />
      </div>
    </section>
  )
}
