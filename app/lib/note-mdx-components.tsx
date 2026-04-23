import type { ComponentProps, ComponentPropsWithoutRef, ReactNode } from 'react'
import Image from 'next/image'
import YouTube from 'app/components/YouTube'
import Tweet from 'app/components/Tweet'
import { extractYoutubeId } from 'app/lib/youtube-id'
import { extractTweetId } from 'app/lib/tweet-id'
import { buildNoteImageProxyUrl } from 'app/lib/rewrite-note-images'

function NoteImg({ src, alt, ...rest }: ComponentPropsWithoutRef<'img'>) {
  if (typeof src === 'string') {
    const proxied = buildNoteImageProxyUrl(src)
    if (proxied) {
      return <img src={proxied} alt={alt ?? ''} {...rest} />
    }
  }
  return <img src={src} alt={alt ?? ''} {...rest} />
}

function childrenToText(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.filter((c) => typeof c === 'string').join('')
  return ''
}

/**
 * True when the link's visible text is effectively the raw href. This is how
 * GitHub-flavored autolinks (bare URLs on their own line) surface through
 * remark-gfm: href and child text both equal the URL.
 */
function linkTextMatchesHref(childText: string, href: string, id: string): boolean {
  if (!childText) return true
  if (childText === href) return true
  if (childText === id) return true
  const hrefNorm = href.replace(/\/$/, '')
  const childNorm = childText.replace(/\/$/, '')
  return childNorm === hrefNorm
}

function MarkdownLink({
  href,
  children,
  ...rest
}: ComponentPropsWithoutRef<'a'>) {
  if (href) {
    const childText = childrenToText(children)
    const youtubeId = extractYoutubeId(href)
    if (youtubeId && linkTextMatchesHref(childText, href, youtubeId)) {
      return <YouTube id={youtubeId} />
    }
    const tweetId = extractTweetId(href)
    if (tweetId && linkTextMatchesHref(childText, href, tweetId)) {
      return <Tweet id={tweetId} url={href} />
    }
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

export const noteMdxComponents = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => <h1 {...props} />,
  h2: (props: ComponentPropsWithoutRef<'h2'>) => <h2 {...props} />,
  h3: (props: ComponentPropsWithoutRef<'h3'>) => <h3 {...props} />,
  h4: (props: ComponentPropsWithoutRef<'h4'>) => <h4 {...props} />,
  h5: (props: ComponentPropsWithoutRef<'h5'>) => <h5 {...props} />,
  h6: (props: ComponentPropsWithoutRef<'h6'>) => <h6 {...props} />,
  Image: (props: ComponentProps<typeof Image>) => (
    <Image
      {...props}
      width={Number(props.width) || 800}
      height={Number(props.height) || 600}
    />
  ),
  YouTube,
  Tweet,
  a: MarkdownLink,
  img: NoteImg,
  code: (props: ComponentPropsWithoutRef<'code'>) => <code {...props} />,
  Table: (props: ComponentPropsWithoutRef<'table'>) => <table {...props} />,
}
