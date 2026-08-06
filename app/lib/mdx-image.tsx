import path from 'node:path'
import { cache } from 'react'
import { imageSizeFromFile } from 'image-size/fromFile'
import Image from 'next/image'

// Post body column is max-w-2xl (672px).
const SIZES = '(max-width: 672px) 100vw, 672px'

// Real intrinsic dimensions for files under public/, so the layout box matches
// the actual aspect ratio (MDX call sites historically hardcode 800x600).
// Runs at build/render time on the server only; React.cache dedupes per render.
const localImageDims = cache(async (src: string) => {
  try {
    const filePath = path.join(process.cwd(), 'public', decodeURIComponent(src))
    const { width, height, orientation } = await imageSizeFromFile(filePath)
    if (!width || !height) return null
    // EXIF orientations 5-8 are rotated 90°: swap reported dimensions.
    if (orientation && orientation >= 5) {
      return { width: height, height: width }
    }
    return { width, height }
  } catch {
    return null
  }
})

function isLocal(src: unknown): src is string {
  return typeof src === 'string' && src.startsWith('/') && !src.startsWith('//')
}

// Override for markdown ![]() images in blog posts. Local files get next/image
// (optimized, resized, lazy); anything else falls back to a lazy raw <img>.
export async function MdxImg({ src, alt, ...rest }: React.ComponentPropsWithoutRef<'img'>) {
  if (isLocal(src)) {
    const dims = await localImageDims(src)
    if (dims) {
      return <Image src={src} alt={alt ?? ''} {...dims} sizes={SIZES} />
    }
  }
  return <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" {...rest} />
}

// Override for explicit <Image> MDX call sites: measured dimensions win over
// the hardcoded 800x600 most posts carry.
export async function MdxImage({ src, alt, width, height, ...rest }: any) {
  const dims = isLocal(src) ? await localImageDims(src) : null
  return (
    <Image
      src={src}
      alt={alt ?? ''}
      width={dims?.width ?? (Number(width) || 800)}
      height={dims?.height ?? (Number(height) || 600)}
      sizes={SIZES}
      {...rest}
    />
  )
}
