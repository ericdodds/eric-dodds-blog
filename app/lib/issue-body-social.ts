/**
 * Prepare GitHub issue body for social APIs: plain text + image URLs for Typefully media.
 */

const IMAGE_EXT = /\.(png|jpe?g|gif|webp)(\?|#|$)/i

function isProbablyImageUrl(url: string): boolean {
  const u = url.split('?')[0].split('#')[0]
  return (
    IMAGE_EXT.test(u) ||
    url.includes('user-images.githubusercontent.com') ||
    url.includes('private-user-images.githubusercontent.com') ||
    url.includes('github.com/user-attachments/assets/')
  )
}

/** Markdown ![]() and MDX <Image src="..." /> — ordered, de-duped. */
export function extractImageUrlsFromIssueBody(md: string): string[] {
  const seen = new Set<string>()
  const urls: string[] = []

  const mdImage = /!\[[^\]]*\]\(([^)]+)\)/g
  let m: RegExpExecArray | null
  while ((m = mdImage.exec(md)) !== null) {
    const u = m[1].trim().replace(/^<|>$/g, '')
    if (u && !seen.has(u) && isProbablyImageUrl(u)) {
      seen.add(u)
      urls.push(u)
    }
  }

  const mdxImage = /<Image[^>]+src=["']([^"']+)["'][^>]*\/?>/gi
  while ((m = mdxImage.exec(md)) !== null) {
    const u = m[1].trim()
    if (u && !seen.has(u) && isProbablyImageUrl(u)) {
      seen.add(u)
      urls.push(u)
    }
  }

  return urls
}

/** Strip markdown/MDX to plain text for post bodies (images removed; link URLs kept). */
export function issueBodyToSocialPlainText(md: string | null): string {
  if (!md) return ''
  let s = md

  s = s.replace(/!\[[^\]]*\]\([^)]+\)/g, '')
  s = s.replace(/<Image[^/>]+\/?>/gi, '')
  s = s.replace(/<YouTube[^/>]+\/?>/gi, '')

  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2')

  s = s.replace(/^#{1,6}\s+/gm, '')
  s = s.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
  s = s.replace(/`([^`]+)`/g, '$1')

  return s.replace(/\n{3,}/g, '\n\n').trim()
}
