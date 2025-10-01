import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { getModelById } from '../../lib/models'

export async function POST(request: Request) {
  let model: string | undefined
  try {
    const requestData = await request.json()
    const { content, title, model: requestModel } = requestData
    model = requestModel

    if (!content || !title || !model) {
      return Response.json(
        { error: 'Content, title, and model are required' },
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
    
    // Check if AI Gateway is configured
    if (!process.env.AI_GATEWAY_API_KEY) {
      return Response.json(
        { error: 'AI Gateway not configured. Please set AI_GATEWAY_API_KEY environment variable.' },
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
      hasGatewayKey: !!process.env.AI_GATEWAY_API_KEY
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
