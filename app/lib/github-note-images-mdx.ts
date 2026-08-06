import type { Node } from 'unist'
import { visit } from 'unist-util-visit'
import { buildNoteImageProxyUrl } from 'app/lib/rewrite-note-images'

export type NoteImagePluginOptions = { issueNumber?: number }

function patchImgPropertiesSrc(
  properties: Record<string, unknown> | undefined,
  issueNumber?: number
): void {
  if (!properties?.src) return
  const raw = properties.src
  const s =
    typeof raw === 'string'
      ? raw
      : Array.isArray(raw)
        ? raw.find((x): x is string => typeof x === 'string')
        : undefined
  if (!s) return
  const proxied = buildNoteImageProxyUrl(s, issueNumber)
  if (proxied) properties.src = proxied
}

type MdxJsxAttribute = { type: string; name?: string; value?: unknown }
type MdxJsxImgNode = { type?: string; name?: string; attributes?: MdxJsxAttribute[] }

/**
 * GitHub inserts pasted images as HTML (`<img alt="Image" src="…">`), which MDX
 * parses as JSX elements (mdxJsxFlowElement/mdxJsxTextElement) — NOT as mdast
 * 'html' nodes or hast 'element' nodes, so the other visitors never see them.
 */
function patchMdxJsxImgSrc(node: MdxJsxImgNode, issueNumber?: number): void {
  if (node.name !== 'img' || !Array.isArray(node.attributes)) return
  const attr = node.attributes.find(
    (a) => a.type === 'mdxJsxAttribute' && a.name === 'src'
  )
  if (!attr || typeof attr.value !== 'string') return
  const proxied = buildNoteImageProxyUrl(attr.value, issueNumber)
  if (proxied) attr.value = proxied
}

/**
 * Rewrite mdast image + inline HTML <img> before MDX compiles to JSX.
 * Pass `{ issueNumber }` so the proxy can re-resolve expired/auth-only GitHub
 * URLs at request time.
 */
export function remarkGithubNoteImages(options?: NoteImagePluginOptions) {
  const issueNumber = options?.issueNumber
  return function remarkGithubNoteImagesTree(tree: Node) {
    visit(tree, 'image', (node: { url?: string }) => {
      if (typeof node.url !== 'string') return
      const proxied = buildNoteImageProxyUrl(node.url, issueNumber)
      if (proxied) node.url = proxied
    })
    visit(tree, 'html', (node: { value?: string }) => {
      if (typeof node.value !== 'string') return
      node.value = node.value.replace(
        /(<img\b[^>]*\bsrc=)(["'])([^"']+)(\2)/gi,
        (full, pre: string, q: string, url: string) => {
          const proxied = buildNoteImageProxyUrl(url, issueNumber)
          return proxied ? `${pre}${q}${proxied}${q}` : full
        }
      )
    })
    visit(tree, 'mdxJsxFlowElement', (node: MdxJsxImgNode) => patchMdxJsxImgSrc(node, issueNumber))
    visit(tree, 'mdxJsxTextElement', (node: MdxJsxImgNode) => patchMdxJsxImgSrc(node, issueNumber))
  }
}

/**
 * Catch any `img` in hast (covers MDX/GMF output that skipped remark passes).
 */
export function rehypeGithubNoteImages(options?: NoteImagePluginOptions) {
  const issueNumber = options?.issueNumber
  return function rehypeGithubNoteImagesTree(tree: Node) {
    visit(tree, 'element', (node: Record<string, unknown>) => {
      if (node.tagName !== 'img') return
      patchImgPropertiesSrc(node.properties as Record<string, unknown> | undefined, issueNumber)
    })
  }
}
