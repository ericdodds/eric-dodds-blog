import type { Node } from 'unist'
import { visit } from 'unist-util-visit'
import { extractTweetId } from 'app/lib/tweet-id'
import { extractYoutubeId } from 'app/lib/youtube-id'

/**
 * `MarkdownLink` (note-mdx-components) swaps bare tweet/YouTube autolinks for
 * block-level embed components (`<Tweet>` renders a `<div>`/`<article>`;
 * `<YouTube>` renders a `<div>`/`<iframe>`). remark-gfm autolinks a bare URL on
 * its own line and wraps it in a `<p>`, so the embed ends up nested inside a
 * `<p>` — invalid HTML that triggers hydration errors:
 *   <p><div>…</div></p>, <p><article>…</article></p>, <p><p>…</p></p>
 *
 * This rehype plugin rewrites such a `<p>` into a `<div>` so the block embed has
 * a valid container. It only fires when the paragraph's *only* child is a link
 * whose href is an embeddable tweet/YouTube URL — inline links are left alone.
 */

type HastChild = {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
}

type HastElement = {
  type: 'element'
  tagName: string
  properties?: Record<string, unknown>
  children?: HastChild[]
}

function hrefOf(child: HastChild | undefined): string | null {
  if (!child || child.type !== 'element' || child.tagName !== 'a') return null
  const href = child.properties?.href
  return typeof href === 'string' ? href : null
}

function isEmbeddableUrl(url: string): boolean {
  return extractTweetId(url) != null || extractYoutubeId(url) != null
}

function isStandaloneEmbedParagraph(node: Node): boolean {
  if (node.type !== 'element') return false
  const el = node as unknown as HastElement
  if (el.tagName !== 'p') return false
  const children = el.children
  if (!children || children.length === 0) return false
  // Allow optional surrounding whitespace-only text nodes (blank lines/indent).
  const meaningful = children.filter(
    (c) => !(c.type === 'text' && (c.value ?? '').trim() === '')
  )
  if (meaningful.length !== 1) return false
  const href = hrefOf(meaningful[0])
  return href != null && isEmbeddableUrl(href)
}

export function rehypeEmbedUnwrap() {
  return function rehypeEmbedUnwrapTree(tree: Node) {
    visit(tree, 'element', (node: Node) => {
      if (isStandaloneEmbedParagraph(node)) {
        (node as unknown as HastElement).tagName = 'div'
      }
    })
  }
}
