import { notFound } from 'next/navigation'
import { cacheLife } from 'next/cache'
import Link from 'next/link'
import { formatDate, getBlogPosts, GITHUB_BASE_URL } from 'app/blog/utils'
import { baseUrl } from 'app/sitemap'
import ImageModalEnhancer from 'app/components/ImageModalEnhancer'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import { MdxImage, MdxImg } from 'app/lib/mdx-image'
import YouTube from 'app/components/YouTube'
import Table from 'app/components/Table'

export async function generateStaticParams() {
  let posts = getBlogPosts()

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  let post = getBlogPosts().find((post) => post.slug === slug)
  if (!post) {
    return
  }

  let {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
  } = post.metadata
  let ogImage = image
    ? image
    : `${baseUrl}/og?title=${encodeURIComponent(title)}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime,
      url: `${baseUrl}/blog/${post.slug}`,
      images: [
        {
          url: ogImage,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

const components = {
  h1: (props) => <h1 {...props} />,
  h2: (props) => <h2 {...props} />,
  h3: (props) => <h3 {...props} />,
  h4: (props) => <h4 {...props} />,
  h5: (props) => <h5 {...props} />,
  h6: (props) => <h6 {...props} />,
  Image: MdxImage,
  img: MdxImg,
  a: (props) => <a {...props} />,
  code: (props) => <code {...props} />,
  Table: (props) => (
    <Table {...props} />
  ),
  table: (props) => (
    <Table {...props} />
  ),
  YouTube,
}

export default async function Blog({ params }) {
  const { slug } = await params
  let post = getBlogPosts().find((post) => post.slug === slug)

  if (!post) {
    notFound()
  }

  return <BlogContent post={post} />
}

async function BlogContent({ post }: { post: ReturnType<typeof getBlogPosts>[number] }) {
  // Include the source in the cache key so saved MDX edits are reflected on
  // refresh. Keep compilation and image measuring in a cache scope.
  'use cache'
  cacheLife('max')
  
  const componentsWithGitHub = {
    ...components,
    GitHubLink: () => (
      <div className="mt-6">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          View the commit history for this post on{' '}
          <a
            href={`${GITHUB_BASE_URL}/app/blog/posts/${post.metadata.githubPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            GitHub
          </a>
          {post.metadata.aiTranscriptUrl && (
            <>
              {' '}or read the{' '}
              <a
                href={post.metadata.aiTranscriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                AI chat transcript
              </a>
              {' '}from the editing process.
            </>
          )}
        </p>
      </div>
    ),
  }

  return (
    <section>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.summary,
            image: post.metadata.image
              ? `${baseUrl}${post.metadata.image}`
              : `/og?title=${encodeURIComponent(post.metadata.title)}`,
            url: `${baseUrl}/blog/${post.slug}`,
            author: {
              '@type': 'Person',
              name: 'Eric Dodds',
            },
          }),
        }}
      />
      <h1 className="title font-semibold text-2xl tracking-tighter text-neutral-950 dark:text-white">
        {post.metadata.title}
      </h1>
<div className="mt-2 mb-4 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(post.metadata.publishedAt)}
          <span aria-hidden className="mx-1.5 text-neutral-400 dark:text-neutral-500">
            ·
          </span>
          <Link
            href="/"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            Eric Dodds Weblog
          </Link>
        </p>
        <div>
          <Link href="/subscribe" className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors">
            Subscribe
          </Link>
        </div>
      </div>
      <article className="prose">
          <div className="blog-content">
            <ImageModalEnhancer>
              {await MDXRemote({
                source: post.content,
                components: componentsWithGitHub,
                options: {
                  mdxOptions: {
                    remarkPlugins: [remarkGfm],
                    rehypePlugins: [rehypeSlug],
                  },
                },
              })}
            </ImageModalEnhancer>
          </div>
        </article>
    </section>
  )
}
