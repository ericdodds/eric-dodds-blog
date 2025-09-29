import { notFound } from 'next/navigation'
import { formatDate, getBlogPosts, GITHUB_BASE_URL } from 'app/blog/utils'
import { baseUrl } from 'app/sitemap'
import ImageModalEnhancer from 'app/components/ImageModalEnhancer'
import SummarizeButton from 'app/components/SummarizeButton'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import Image from 'next/image'
import YouTube from 'app/components/YouTube'

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
  Image: (props) => <Image {...props} />,
  a: (props) => <a {...props} />,
  code: (props) => <code {...props} />,
  Table: (props) => <table {...props} />,
  YouTube,
}

export default async function Blog({ params }) {
  const { slug } = await params
  let post = getBlogPosts().find((post) => post.slug === slug)

  if (!post) {
    notFound()
  }

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
              name: 'My Portfolio',
            },
          }),
        }}
      />
      <h1 className="title font-semibold text-2xl tracking-tighter">
        {post.metadata.title}
      </h1>
      <div className="flex justify-between items-center mt-2 mb-4 text-sm">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {formatDate(post.metadata.publishedAt)}
        </p>
        <div>
          <SummarizeButton content={post.content} title={post.metadata.title} />
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
