/**
 * Rewrite GitHub-hosted image URLs in issue markdown/HTML to the local proxy so
 * MDX doesn’t need a working `components.img` merge (RSC), and private-repo
 * assets work with GITHUB_TOKEN server-side.
 */

const PROXY_PATH = '/api/notes-media'

/** Image hosts GitHub uses in issues (user upload, camo proxy, JWT links, media CDN). */
export function noteImageUrlShouldBeProxied(url: string): boolean {
  try {
    const u = new URL(url.trim())
    if (u.protocol !== 'https:') return false
    if (u.hostname === 'camo.githubusercontent.com') return true
    if (u.hostname === 'user-images.githubusercontent.com') return true
    if (u.hostname === 'private-user-images.githubusercontent.com') return true
    if (u.hostname === 'media.githubusercontent.com') return true
    if (
      u.hostname === 'github.com' &&
      u.pathname.startsWith('/user-attachments/assets/')
    ) {
      return true
    }
    if (
      u.hostname === 'github.com' &&
      /\/assets\//.test(u.pathname) &&
      /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(u.pathname)
    ) {
      return true
    }
    return false
  } catch {
    return false
  }
}

/** Same-origin path + query the browser and MDX use for a GitHub image `src`. */
export function buildNoteImageProxyUrl(original: string): string | null {
  const t = original.trim()
  if (!noteImageUrlShouldBeProxied(t)) return null
  return `${PROXY_PATH}?url=${encodeURIComponent(t)}`
}
