import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // .md URLs always return markdown (for agents that don't use Accept header)
        { source: '/blog/:slug.md', destination: '/api/markdown/blog/:slug' },
        { source: '/blog.md', destination: '/api/markdown/blog' },
        { source: '/index.md', destination: '/api/markdown' },
        { source: '/about.md', destination: '/api/markdown/about' },
        { source: '/contact.md', destination: '/api/markdown/contact' },
        { source: '/subscribe.md', destination: '/api/markdown/subscribe' },
        // Accept: text/markdown triggers markdown for any path
        {
          source: '/:path*',
          has: [{ type: 'header', key: 'accept', value: '(.*)text/markdown(.*)' }],
          destination: '/api/markdown/:path*',
        },
      ],
    }
  },
}

export default nextConfig
