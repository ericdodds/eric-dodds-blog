import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Adjustable: circle logo diameter in pixels. Canvas is 2400x1260 (retina).
const AVATAR_SIZE = 230

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Eric Dodds Weblog'

  const [logoData, fontSemiBold, fontBold] = await Promise.all([
    readFile(path.join(process.cwd(), 'public', 'icons', 'dodds-logo-og.png')),
    readFile(
      path.join(
        process.cwd(),
        'node_modules',
        'geist',
        'dist',
        'fonts',
        'geist-sans',
        'Geist-SemiBold.ttf'
      )
    ),
    readFile(
      path.join(
        process.cwd(),
        'node_modules',
        'geist',
        'dist',
        'fonts',
        'geist-sans',
        'Geist-Bold.ttf'
      )
    ),
  ])

  const logo = `data:image/png;base64,${logoData.toString('base64')}`

  return new ImageResponse(
    (
      <div
        tw="flex flex-col w-full h-full"
        style={{
          fontFamily: 'Geist Sans',
          background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        }}
      >
        <div
          tw="flex flex-col w-full h-full justify-between"
          style={{ padding: 100 }}
        >
          {/* Top row: circle logo + site name to its right */}
          <div tw="flex flex-row items-center" style={{ gap: 48 }}>
            <img
              src={logo}
              style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            />
            <div
              style={{
                fontWeight: 600,
                fontSize: 96,
                letterSpacing: '-0.02em',
                color: '#171717',
              }}
            >
              Eric Dodds Weblog
            </div>
          </div>
          {/* Post title */}
          <div
            style={{
              fontWeight: 700,
              fontSize: 160,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#171717',
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    {
      width: 2400,
      height: 1260,
      fonts: [
        { name: 'Geist Sans', data: fontSemiBold, style: 'normal', weight: 600 },
        { name: 'Geist Sans', data: fontBold, style: 'normal', weight: 700 },
      ],
    }
  )
}
