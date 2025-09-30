import { MODELS, getModelById } from '../models'

// Simple test runner without Jest
function test(description: string, fn: () => void) {
  try {
    fn()
    console.log(`✅ ${description}`)
  } catch (error) {
    console.log(`❌ ${description}`)
    console.log(`   Error: ${error}`)
  }
}

function expect(actual: any) {
  return {
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      }
    },
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`)
      }
    },
    toMatch: (pattern: RegExp) => {
      if (!pattern.test(actual)) {
        throw new Error(`Expected ${actual} to match ${pattern}`)
      }
    },
    toContain: (expected: any) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`)
      }
    },
    toHaveProperty: (prop: string) => {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property ${prop}`)
      }
    },
    toBeUndefined: () => {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${actual}`)
      }
    }
  }
}

// Run tests
console.log('Running model tests...\n')

test('should have all required model providers', () => {
  const expectedProviders = ['openai', 'anthropic', 'google', 'perplexity', 'xai']
  const actualProviders = Object.keys(MODELS)
  
  expect(actualProviders).toEqual(expectedProviders)
})

test('should have valid model configurations for each provider', () => {
  Object.entries(MODELS).forEach(([key, model]) => {
    expect(model).toHaveProperty('id')
    expect(model).toHaveProperty('name')
    expect(model).toHaveProperty('provider')
    expect(model).toHaveProperty('logo')
    
    expect(typeof model.id).toBe('string')
    expect(typeof model.name).toBe('string')
    expect(typeof model.provider).toBe('string')
    expect(model.id).toMatch(/^[a-z-]+\/[a-z0-9.-]+$/) // Should match provider/model format
  })
})

test('should have model IDs in the correct provider/model format', () => {
  Object.entries(MODELS).forEach(([key, model]) => {
    expect(model.id).toMatch(/^[a-z-]+\/[a-z0-9.-]+$/)
  })
})

test('should have unique model IDs', () => {
  const modelIds = Object.values(MODELS).map(model => model.id)
  const uniqueIds = new Set(modelIds)
  expect(uniqueIds.size).toBe(modelIds.length)
})

test('should have provider names that match the key', () => {
  Object.entries(MODELS).forEach(([key, model]) => {
    expect(model.provider.toLowerCase()).toContain(key.toLowerCase())
  })
})

test('should return the correct model for valid IDs', () => {
  Object.values(MODELS).forEach(model => {
    const result = getModelById(model.id)
    expect(result).toEqual(model)
  })
})

test('should return undefined for invalid IDs', () => {
  const invalidIds = [
    'invalid/model',
    'openai/invalid-model',
    'nonexistent-provider/model',
    '',
    'not-a-valid-format'
  ]
  
  invalidIds.forEach(id => {
    expect(getModelById(id)).toBeUndefined()
  })
})

test('should be case sensitive', () => {
  const validId = Object.values(MODELS)[0].id
  const upperCaseId = validId.toUpperCase()
  
  expect(getModelById(upperCaseId)).toBeUndefined()
})

test('should have OpenAI models starting with openai/', () => {
  const openaiModel = MODELS.openai
  expect(openaiModel.id).toMatch(/^openai\//)
})

test('should have Anthropic models starting with anthropic/', () => {
  const anthropicModel = MODELS.anthropic
  expect(anthropicModel.id).toMatch(/^anthropic\//)
})

test('should have Google models starting with google/', () => {
  const googleModel = MODELS.google
  expect(googleModel.id).toMatch(/^google\//)
})

test('should have Perplexity models starting with perplexity/', () => {
  const perplexityModel = MODELS.perplexity
  expect(perplexityModel.id).toMatch(/^perplexity\//)
})

test('should have xAI models starting with xai/', () => {
  const xaiModel = MODELS.xai
  expect(xaiModel.id).toMatch(/^xai\//)
})

console.log('\nAll tests completed!')
