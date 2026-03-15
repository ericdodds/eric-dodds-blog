import { getBlogPosts, formatDate } from 'app/blog/utils'
import { mdxToMarkdown } from 'app/blog/mdx-to-markdown'
import { baseUrl } from 'app/sitemap'

const CONTACT_FORM_URL = 'https://usebasin.com/f/26f1a0ed87e5'
const SUBSTACK_URL = 'https://ericdodds.substack.com'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  const normalizedPath = path.length === 0 ? [] : path
  const pathStr = normalizedPath.join('/')

  let markdown: string

  if (pathStr === '') {
    // Home: / -> intro + links + 5 recent posts
    const posts = getBlogPosts()
      .sort((a, b) => (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt) ? -1 : 1))
      .slice(0, 5)

    const postList = posts
      .map((p) => `- [${p.metadata.title}](${baseUrl}/blog/${p.slug}) - ${formatDate(p.metadata.publishedAt)}`)
      .join('\n')

    markdown = `# Eric Dodds Weblog

My name is Eric Dodds. I'm a Christian, husband, father, writer and tech marketing leader, ideally in that order.

This is my corner of the internet. You can read my [writing](${baseUrl}/blog), learn more [about me](${baseUrl}/about) or [reach out](${baseUrl}/contact) to say hello.

## Recent blog posts

${postList}
`
  } else if (pathStr === 'blog') {
    // Blog index: /blog -> sitemap
    const posts = getBlogPosts().sort((a, b) =>
      new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt) ? -1 : 1
    )

    const postList = posts
      .map((p) => `- [${p.metadata.title}](${baseUrl}/blog/${p.slug}) - ${formatDate(p.metadata.publishedAt)}`)
      .join('\n')

    markdown = `# Eric Dodds Weblog

Blog index. Request any post URL with \`Accept: text/markdown\` for markdown.

## Posts

${postList}
`
  } else if (pathStr.startsWith('blog/')) {
    // Blog post: /blog/:slug
    const slug = pathStr.slice(5)
    const post = getBlogPosts().find((p) => p.slug === slug)
    if (!post) {
      return new Response('Not found', { status: 404 })
    }

    const body = mdxToMarkdown(post.content, {
      githubPath: post.metadata.githubPath || `${post.slug}.mdx`,
    })

    markdown = `# ${post.metadata.title}

${formatDate(post.metadata.publishedAt)}

---

${body}
`
  } else if (pathStr === 'about') {
    markdown = `# About Me

## Professional bio

Here's the obligatory [LinkedIn profile](https://www.linkedin.com/in/ericdodds/).

I'm currently on the technical marketing team at [Vercel](https://vercel.com), an AI and frontend cloud platform. You can read my blog post about joining Vercel [here](https://www.ericdodds.com/blog/im-joining-vercel-after-5-years-at-rudderstack).

My previous role was Head of Product at RudderStack, a pipeline infrastructure company that streams behavioral event data. I've also founded multiple businesses, both venture-backed and bootstrapped. Several companies failed, one exited and one is still running under new ownership.

Over the years I've held key go-to-market roles with a focus on marketing. I find great joy working close to and in product. I particularly enjoy tackling the XY problem, working directly with engineers and driving growth through product marketing.

I've proven my ability to take functions from 0-1 (and beyond) as a player-coach, build teams and ship work as an individual contributor. I function well in ambiguity.

I've mastered a variety of tactical skills across product, marketing, product marketing, data/analytics and have built efficient operations in each of those areas. In another life I would have been a software engineer, so the age of AI is a true dream as a technical tinkerer.

My peers describe my superpowers as first-principles thinking, product-mindedness and writing (of all kinds). On multiple occasions these have been applied in the formation of strategies, both on a micro and macro level.

> Eric has a unique ability to translate complex technical concepts into compelling narratives that move businesses forward. At RudderStack, he was the partner I consistently turned to when we needed to challenge our thinking and ensure we were building something customers would actually value. His product intuition, combined with his marketing expertise, made him an invaluable cross-functional leader who could be counted on when execution really mattered.
>
> —Sagan Shultz, Product @ Linear

## Writing

When I updated this bio in the summer of 2025, I was still looking for a job in product, but as it happened I had the opportunity to try my hand at professional writing sooner than I expected.

Professionally I have written technical documentation and tutorials, books on technical topics (one published), UX copy, internal strategy memos, technical blog posts, thought leadership pieces, web copy, advertising copy, enterprise product marketing collateral, scripts (audio and video) and more. Personally I write this blog and have written one short biography (also published).

This blog went stale for some time, but I wrote an immense amount in that time, both personally and professionally (including a published memoir about my special needs brother-in-law).

## Personal bio

I live in South Carolina with my wife and three children.

When I'm not working, I like to be outside. I'm an avid mountain biker and runner.

I also enjoy working with my hands. I'm an amateur mechanic, so I'm often fixing something around the house and tinkering with our beloved 1985 Toyota Land Cruiser FJ60.
`
  } else if (pathStr === 'contact') {
    markdown = `# Contact

I'd be happy to make your acquaintance and answer any questions you have. Use the [contact form](${CONTACT_FORM_URL}) and I'll get back to you as soon as I can.
`
  } else if (pathStr === 'subscribe') {
    markdown = `# Subscribe

Join almost 3,000 subscribers via Substack to get notified about new posts. I write regularly about product, technology and productivity.

[Subscribe via Substack](${SUBSTACK_URL})
`
  } else {
    return new Response('Not found', { status: 404 })
  }

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  })
}
