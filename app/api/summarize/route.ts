import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(request: Request) {
  try {
    const { content, title } = await request.json()

    if (!content || !title) {
      return Response.json(
        { error: 'Content and title are required' },
        { status: 400 }
      )
    }

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `You are a helpful assistant that creates concise, engaging summaries of blog posts. 
      
      Your summaries should:
      - Be 2-3 sentences long
      - Capture the main argument or key insights
      - Be written in a clear, accessible tone
      - Avoid jargon and technical terms when possible
      - Focus on the value proposition for the reader
      - Add an HTML unordered list of the top five most relevant links from the footnotes to the summary, with the anchor text from the footnote as the link text. Format links as HTML: <a href="URL" target="_blank" rel="noopener noreferrer">link text</a>. Place each link as a separate list item in the unordered list.The links should be a short, several-word summary of the link and context using the mention in the body content and the footnote text. In a new paragraph after the summary, add "Relevant links from the footnotes:" above the list. `,
      prompt: `Please summarize this blog post titled "${title}":\n\n${content}`,
    })

    return Response.json({ summary: text })
  } catch (error) {
    console.error('Error generating summary:', error)
    return Response.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
