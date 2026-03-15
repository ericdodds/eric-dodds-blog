const BASE_URL = 'https://ericdodds.com'

export type MdxToMarkdownOptions = {
  githubPath?: string
}

/**
 * Converts MDX content to plain markdown for agent consumption.
 * Replaces custom components (Image, YouTube, SubscribeEmbed, GitHubLink) with markdown equivalents.
 */
export function mdxToMarkdown(content: string, options: MdxToMarkdownOptions = {}): string {
  let result = content

  // <Image src="..." alt="..." /> or <Image src='...' alt='...' /> -> ![alt](absoluteUrl)
  result = result.replace(
    /<Image\s+src=["']([^"']+)["']\s+alt=["']([^"']*)["'][^/>]*\/?>/gi,
    (_, src: string, alt: string) => {
      const absoluteSrc = src.startsWith('/') ? `${BASE_URL}${src}` : src
      return `![${alt}](${absoluteSrc})`
    }
  )

  // <YouTube id="xyz" /> -> [Watch on YouTube](https://youtube.com/watch?v=xyz)
  result = result.replace(
    /<YouTube\s+id=["']([^"']+)["'][^/>]*\/?>/gi,
    (_, id: string) => `[Watch on YouTube](https://www.youtube.com/watch?v=${id})`
  )

  // <SubscribeEmbed /> -> [Subscribe via Substack](https://ericdodds.substack.com)
  result = result.replace(
    /<SubscribeEmbed[^/>]*\/?>/gi,
    '[Subscribe via Substack](https://ericdodds.substack.com)'
  )

  // <GitHubLink /> -> link to commit history if githubPath provided
  const GITHUB_BASE_URL = 'https://github.com/ericdodds/eric-dodds-blog/commits/main'
  if (options.githubPath) {
    result = result.replace(
      /<GitHubLink[^/>]*\/?>/gi,
      `[View commit history on GitHub](${GITHUB_BASE_URL}/app/blog/posts/${options.githubPath})`
    )
  } else {
    result = result.replace(/<GitHubLink[^/>]*\/?>/gi, '')
  }

  return result
}
