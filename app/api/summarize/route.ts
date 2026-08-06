import { generateText } from 'ai'
import { getModelById } from '../../lib/models'
import { getBlogPosts } from '../../blog/utils'

export const maxDuration = 30

export async function POST(request: Request) {
  let model: string | undefined
  try {
    const requestData = await request.json()
    const { slug, model: requestModel } = requestData
    model = requestModel

    if (!slug || !model) {
      return Response.json(
        { error: 'Slug and model are required' },
        { status: 400 }
      )
    }

    // Validate model exists in our registry
    const modelConfig = getModelById(model)
    if (!modelConfig) {
      return Response.json(
        { error: `Model ${model} not supported` },
        { status: 400 }
      )
    }

    // Resolve the post server-side so clients can't feed arbitrary text
    // through the gateway (and the page doesn't ship the raw MDX as a prop).
    const post = getBlogPosts().find((p) => p.slug === slug)
    if (!post) {
      return Response.json({ error: 'Post not found' }, { status: 404 })
    }
    const { title } = post.metadata
    const content = post.content
    
    // AI Gateway auth: prefer Vercel OIDC (VERCEL_OIDC_TOKEN, auto-injected on Vercel
    // deployments and `vercel dev`), fall back to a personal AI_GATEWAY_API_KEY for
    // environments without OIDC (e.g. `next dev` with a pulled dev key).
    if (!process.env.VERCEL_OIDC_TOKEN && !process.env.AI_GATEWAY_API_KEY) {
      return Response.json(
        {
          error:
            'AI Gateway not configured. Run with `vercel dev` (OIDC) or set AI_GATEWAY_API_KEY.',
        },
        { status: 500 }
      )
    }

    // Use AI SDK with AI Gateway (AI Gateway is default when AI_GATEWAY_API_KEY is set)
    const { text } = await generateText({
      model: model,
      system: `You are a helpful assistant that creates concise, engaging summaries of blog posts. 
      
      Your summaries should:
      - Be 2-3 sentences long
      - Capture the main argument or key insights
      - Be written in a clear, accessible tone
      - Avoid jargon and technical terms when possible
      - Focus on the value proposition for the reader
      - Add an HTML unordered list <ul> of the top five most relevant links from the footnotes to the summary, with the anchor text from the footnote as the link text. Format links as HTML: <a href="URL" target="_blank" rel="noopener noreferrer">link text</a>. Place each link as a separate list item in the unordered list.The links should be a short, several-word summary of the link and context using the mention in the body content and the footnote text. In a new paragraph after the summary, add "Top links from the footnotes:" above the list. Do not format this as markdown.`,
      prompt: `Please summarize this blog post titled "${title}":\n\n${content}`,
    })

    return Response.json({ summary: text })
  } catch (error) {
    console.error('Error generating summary:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      model: model,
      hasGatewayKey: !!process.env.AI_GATEWAY_API_KEY,
      hasOidcToken: !!process.env.VERCEL_OIDC_TOKEN,
    })
    return Response.json(
      { 
        error: 'Failed to generate summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
