import type { ComponentProps, ComponentPropsWithoutRef } from 'react'
import Image from 'next/image'
import YouTube from 'app/components/YouTube'
import { extractYoutubeId } from 'app/lib/youtube-id'
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

function MarkdownLink({
  href,
  children,
  ...rest
}: ComponentPropsWithoutRef<'a'>) {
  if (href) {
    const id = extractYoutubeId(href)
    if (id) {
      const childText =
        typeof children === 'string'
          ? children
          : Array.isArray(children)
            ? children.join('')
            : ''
      const hrefNorm = href.replace(/\/$/, '')
      const childNorm = childText.replace(/\/$/, '')
      if (
        !childText ||
        childText === href ||
        childNorm === hrefNorm ||
        childText === id
      ) {
        return <YouTube id={id} />
      }
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
  a: MarkdownLink,
  img: NoteImg,
  code: (props: ComponentPropsWithoutRef<'code'>) => <code {...props} />,
  Table: (props: ComponentPropsWithoutRef<'table'>) => <table {...props} />,
}
