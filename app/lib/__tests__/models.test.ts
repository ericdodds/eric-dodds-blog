import { MODELS, getModelById, getModelByProvider } from '../models.tsx'

describe('Model Registry', () => {
  test('should have all expected providers', () => {
    const expectedProviders = ['openai', 'anthropic', 'google', 'perplexity', 'xai']
    const actualProviders = Object.keys(MODELS)
    
    expectedProviders.forEach(provider => {
      expect(actualProviders).toContain(provider)
    })
  })

  test('should return correct model by ID', () => {
    const openaiModel = getModelById('gpt-4o')
    expect(openaiModel).toBeDefined()
    expect(openaiModel?.name).toBe('OpenAI')
    expect(openaiModel?.provider).toBe('OpenAI')
  })

  test('should return correct model by provider', () => {
    const anthropicModel = getModelByProvider('anthropic')
    expect(anthropicModel).toBeDefined()
    expect(anthropicModel?.name).toBe('Anthropic')
    expect(anthropicModel?.id).toBe('claude-3-5-sonnet-20241022')
  })

  test('should return undefined for non-existent model', () => {
    const nonExistentModel = getModelById('non-existent-model')
    expect(nonExistentModel).toBeUndefined()
  })
})
