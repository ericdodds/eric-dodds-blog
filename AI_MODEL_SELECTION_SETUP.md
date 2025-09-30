# AI Model Selection Setup

This document describes the environment variables needed for the AI model selection feature.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variable:

```bash
# AI Gateway Configuration
# The AI Gateway handles all model calls and provider routing
AI_GATEWAY_API_KEY=your_ai_gateway_api_key_here
```

## How It Works

1. **AI Gateway**: The AI SDK automatically detects `AI_GATEWAY_API_KEY` and routes all calls through Vercel's AI Gateway
2. **No Individual API Keys Needed**: The AI Gateway handles authentication with all providers (OpenAI, Anthropic, Google, Perplexity, xAI)
3. **AI SDK Integration**: Uses `generateText()` from the AI SDK - no custom API calls needed
4. **Model Selection**: Users can select from any supported provider using the `provider/model` format (e.g., `openai/gpt-4o`, `anthropic/claude-3-5-sonnet-20240620`)
5. **Automatic Routing**: The AI Gateway automatically routes to the correct provider based on the model format
6. **Error Handling**: The system validates that the AI Gateway API key is configured before making any calls

## Available Models

The system supports the following providers and their latest general-use models:

- **OpenAI**: `openai/gpt-5` (400K context, $1.25/M input, $10.00/M output)
- **Anthropic**: `anthropic/claude-sonnet-4` (200K context, $3.00/M input, $15.00/M output)
- **Google**: `google/gemini-2.5-pro` (1M context, $2.50/M input, $10.00/M output)
- **Perplexity**: `perplexity/sonar-pro`
- **xAI**: `xai/grok-2`

## Usage

Users can now click "Summarize with AI" to see a dropdown with model provider options. The system will automatically route to the appropriate provider based on the selection.
