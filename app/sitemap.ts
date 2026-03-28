import { getBlogPosts } from 'app/blog/utils'
import { getNotes } from 'app/lib/github-notes'

export const baseUrl = 'https://ericdodds.com'

export default async function sitemap() {
  let blogs = getBlogPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.metadata.publishedAt,
  }))

  const notes = await getNotes()
  const noteEntries = notes.map((note) => ({
    url: `${baseUrl}/notes/${note.number}`,
    lastModified: note.updated_at,
  }))

  let routes = ['', '/blog', '/notes'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
  }))

  return [...routes, ...blogs, ...noteEntries]
}
