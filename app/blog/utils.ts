import fs from 'fs'
import path from 'path'
import { cache } from 'react'

const GITHUB_BASE_URL = 'https://github.com/ericdodds/eric-dodds-blog/commits/main'

type Metadata = {
  title: string
  publishedAt: string
  summary: string
  image?: string
  published?: string | boolean
  draft?: string | boolean
  githubPath?: string
  aiTranscriptUrl?: string
}

function parseFrontmatter(fileContent: string) {
  let frontmatterRegex = /---\s*([\s\S]*?)\s*---/
  let match = frontmatterRegex.exec(fileContent)
  let frontMatterBlock = match![1]
  let content = fileContent.replace(frontmatterRegex, '').trim()
  let frontMatterLines = frontMatterBlock.trim().split('\n')
  let metadata: Partial<Metadata> = {}

  frontMatterLines.forEach((line) => {
    let [key, ...valueArr] = line.split(': ')
    let value = valueArr.join(': ').trim()
    value = value.replace(/^['"](.*)['"]$/, '$1') // Remove quotes
    metadata[key.trim() as keyof Metadata] = value
  })

  return { metadata: metadata as Metadata, content }
}

function getMDXFiles(dir) {
  return fs.readdirSync(dir).filter((file) => path.extname(file) === '.mdx')
}

function readMDXFile(filePath) {
  let rawContent = fs.readFileSync(filePath, 'utf-8')
  return parseFrontmatter(rawContent)
}

function getMDXData(dir) {
  let mdxFiles = getMDXFiles(dir)
  return mdxFiles.map((file) => {
    let { metadata, content } = readMDXFile(path.join(dir, file))
    let slug = path.basename(file, path.extname(file))

    return {
      metadata: {
        ...metadata,
        // Auto-generate GitHub path if not specified
        githubPath: metadata.githubPath || file
      },
      slug,
      content,
    }
  })
}

// React.cache dedupes the directory read within a render pass — the homepage
// and blog pages each call this several times (list + metadata + page body).
export const getBlogPosts = cache(function getBlogPosts() {
  return getMDXData(path.join(process.cwd(), 'app', 'blog', 'posts'))
    .filter(post => post.metadata.published !== 'false' && post.metadata.published !== false && post.metadata.draft !== 'true' && post.metadata.draft !== true);
})

export { GITHUB_BASE_URL }

export function formatDate(date: string, includeRelative = false) {
  if (!date.includes('T')) {
    date = `${date}T00:00:00`
  }
  let targetDate = new Date(date)

  let fullDate = targetDate.toLocaleString('en-us', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (!includeRelative) {
    return fullDate
  }

  // Only touch the current time when a relative date is requested — under
  // Cache Components, new Date() is an unstable value during prerendering.
  let currentDate = new Date()
  let yearsAgo = currentDate.getFullYear() - targetDate.getFullYear()
  let monthsAgo = currentDate.getMonth() - targetDate.getMonth()
  let daysAgo = currentDate.getDate() - targetDate.getDate()

  let formattedDate = ''

  if (yearsAgo > 0) {
    formattedDate = `${yearsAgo}y ago`
  } else if (monthsAgo > 0) {
    formattedDate = `${monthsAgo}mo ago`
  } else if (daysAgo > 0) {
    formattedDate = `${daysAgo}d ago`
  } else {
    formattedDate = 'Today'
  }

  return `${fullDate} (${formattedDate})`
}
