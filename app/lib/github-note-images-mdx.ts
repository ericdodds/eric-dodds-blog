import type { Node } from 'unist'
import { visit } from 'unist-util-visit'
import { buildNoteImageProxyUrl } from 'app/lib/rewrite-note-images'

function patchImgPropertiesSrc(properties: Record<string, unknown> | undefined): void {
  if (!properties?.src) return
  const raw = properties.src
  const s =
    typeof raw === 'string'
      ? raw
      : Array.isArray(raw)
        ? raw.find((x): x is string => typeof x === 'string')
        : undefined
  if (!s) return
  const proxied = buildNoteImageProxyUrl(s)
  if (proxied) properties.src = proxied
}

/**
 * Rewrite mdast image + inline HTML <img> before MDX compiles to JSX.
 */
export function remarkGithubNoteImages() {
  return function remarkGithubNoteImagesTree(tree: Node) {
    visit(tree, 'image', (node: { url?: string }) => {
      if (typeof node.url !== 'string') return
      const proxied = buildNoteImageProxyUrl(node.url)
      if (proxied) node.url = proxied
    })
    visit(tree, 'html', (node: { value?: string }) => {
      if (typeof node.value !== 'string') return
      node.value = node.value.replace(
        /(<img\b[^>]*\bsrc=)(["'])([^"']+)(\2)/gi,
        (full, pre: string, q: string, url: string) => {
          const proxied = buildNoteImageProxyUrl(url)
          return proxied ? `${pre}${q}${proxied}${q}` : full
        }
      )
    })
  }
}

/**
 * Catch any `img` in hast (covers MDX/GMF output that skipped remark passes).
 */
export function rehypeGithubNoteImages() {
  return function rehypeGithubNoteImagesTree(tree: Node) {
    visit(tree, 'element', (node: Record<string, unknown>) => {
      if (node.tagName !== 'img') return
      patchImgPropertiesSrc(node.properties as Record<string, unknown> | undefined)
    })
  }
}
