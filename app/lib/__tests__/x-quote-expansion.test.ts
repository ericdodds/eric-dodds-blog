import {
  buildQuoteExpansionBlock,
  computeQuoteExpansion,
  decodeTweetEntities,
  extractCommentaryText,
  mergeQuoteExpansionBlockIntoIssueBody,
  readExpansionSourceId,
  type QuoteTweetLike,
} from '../x-quote-expansion'

// Simple test runner (same style as models.test.ts)
function test(description: string, fn: () => void | Promise<void>) {
  const run = async () => {
    try {
      await fn()
      console.log(`✅ ${description}`)
    } catch (error) {
      console.log(`❌ ${description}`)
      console.log(`   Error: ${error}`)
      process.exitCode = 1
    }
  }
  // fire and forget; final line keeps output ordered via sequential awaits below
  return run()
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
    toContain: (expected: any) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`)
      }
    },
    notToContain: (expected: any) => {
      if (actual.includes(expected)) {
        throw new Error(`Expected ${actual} NOT to contain ${expected}`)
      }
    },
  }
}

function makeQuoteTweet(overrides: Partial<QuoteTweetLike> = {}): QuoteTweetLike {
  const base: QuoteTweetLike = {
    id_str: '111111111111111',
    text: 'hello world https://t.co/abc',
    user: { screen_name: 'me' },
    entities: {
      urls: [
        {
          url: 'https://t.co/abc',
          expanded_url: 'https://x.com/other/status/222222222222222',
          indices: [12, 28] as [number, number],
        },
      ],
    },
    quoted_tweet: {
      id_str: '222222222222222',
      user: { screen_name: 'other' },
    },
  }
  return { ...base, ...overrides }
}

async function main() {
  console.log('Running x-quote-expansion tests...\n')

  await test('decodeTweetEntities handles common HTML entities', () => {
    expect(decodeTweetEntities('foo &amp; bar &lt;x&gt; &quot;y&quot; &#39;z&#39;')).toBe(
      `foo & bar <x> "y" 'z'`
    )
  })

  await test('extractCommentaryText strips trailing t.co URL that points at quoted tweet', () => {
    const tweet = makeQuoteTweet()
    expect(extractCommentaryText(tweet)).toBe('hello world')
  })

  await test('extractCommentaryText decodes entities in the commentary', () => {
    const tweet = makeQuoteTweet({
      text: 'this &amp; that https://t.co/abc',
      entities: {
        urls: [
          {
            url: 'https://t.co/abc',
            expanded_url: 'https://x.com/other/status/222222222222222',
            indices: [16, 32] as [number, number],
          },
        ],
      },
    })
    expect(extractCommentaryText(tweet)).toBe('this & that')
  })

  await test('extractCommentaryText falls back to display_text_range when no status URL entity', () => {
    const tweet = makeQuoteTweet({
      text: 'visible part   trailing',
      entities: { urls: [] },
      display_text_range: [0, 12] as [number, number],
      quoted_tweet: undefined,
    })
    expect(extractCommentaryText(tweet)).toBe('visible part')
  })

  await test('buildQuoteExpansionBlock includes commentary, quoted URL, and discuss link', () => {
    const tweet = makeQuoteTweet()
    const block = buildQuoteExpansionBlock(tweet, 'https://x.com/me/status/111111111111111')
    expect(block).toContain('<!-- x-quote-expansion:start -->')
    expect(block).toContain('<!-- x-quote-source:111111111111111 -->')
    expect(block).toContain('hello world')
    expect(block).toContain('https://x.com/other/status/222222222222222')
    expect(block).toContain('[Discuss on X](https://x.com/me/status/111111111111111)')
    expect(block).toContain('<!-- x-quote-expansion:end -->')
  })

  await test('buildQuoteExpansionBlock omits quoted URL when quoted_tweet is missing', () => {
    const tweet = makeQuoteTweet({ quoted_tweet: undefined })
    const block = buildQuoteExpansionBlock(tweet, 'https://x.com/me/status/111111111111111')
    expect(block).toContain('hello world')
    expect(block).toContain('[Discuss on X](https://x.com/me/status/111111111111111)')
    expect(block).notToContain('https://x.com/other/status/')
  })

  await test('mergeQuoteExpansionBlockIntoIssueBody appends when body has no existing block', () => {
    const body = 'https://x.com/me/status/111111111111111'
    const block = '<!-- x-quote-expansion:start -->\nfoo\n<!-- x-quote-expansion:end -->'
    const merged = mergeQuoteExpansionBlockIntoIssueBody(body, block)
    expect(merged).toContain('https://x.com/me/status/111111111111111')
    expect(merged).toContain(block)
  })

  await test('mergeQuoteExpansionBlockIntoIssueBody replaces existing block in place', () => {
    const body = [
      'https://x.com/me/status/111111111111111',
      '',
      '<!-- x-quote-expansion:start -->',
      'old content',
      '<!-- x-quote-expansion:end -->',
      '',
    ].join('\n')
    const newBlock =
      '<!-- x-quote-expansion:start -->\nnew content\n<!-- x-quote-expansion:end -->'
    const merged = mergeQuoteExpansionBlockIntoIssueBody(body, newBlock)
    expect(merged).toContain('new content')
    expect(merged).notToContain('old content')
  })

  await test('readExpansionSourceId returns the embedded quote tweet id', () => {
    const body =
      '<!-- x-quote-expansion:start -->\n<!-- x-quote-source:12345 -->\nhi\n<!-- x-quote-expansion:end -->'
    expect(readExpansionSourceId(body)).toBe('12345')
  })

  await test('readExpansionSourceId returns null when no marker is present', () => {
    expect(readExpansionSourceId('nothing in here')).toBe(null)
  })

  await test('computeQuoteExpansion is idempotent on second run with same tweet', async () => {
    const tweet = makeQuoteTweet()
    const fetcher = async () => tweet
    const body = 'https://x.com/me/status/111111111111111'

    const first = await computeQuoteExpansion(body, fetcher)
    if (!first.ok) throw new Error(`expected ok, got ${first.reason}`)
    expect(first.changed).toBe(true)

    const second = await computeQuoteExpansion(first.nextBody, fetcher)
    if (!second.ok) throw new Error(`expected ok, got ${second.reason}`)
    expect(second.changed).toBe(false)
    expect(second.nextBody).toBe(first.nextBody)
  })

  await test('computeQuoteExpansion returns no_tweet_url when body has no standalone X URL', async () => {
    const fetcher = async () => makeQuoteTweet()
    const result = await computeQuoteExpansion('just some prose with no urls', fetcher)
    if (result.ok) throw new Error('expected not-ok')
    expect(result.reason).toBe('no_tweet_url')
  })

  await test('computeQuoteExpansion returns tweet_fetch_failed when fetcher returns null', async () => {
    const fetcher = async () => null
    const result = await computeQuoteExpansion(
      'https://x.com/me/status/111111111111111',
      fetcher
    )
    if (result.ok) throw new Error('expected not-ok')
    expect(result.reason).toBe('tweet_fetch_failed')
  })

  await test('computeQuoteExpansion falls back when quoted_tweet is missing', async () => {
    const tweet = makeQuoteTweet({ quoted_tweet: undefined, entities: { urls: [] } })
    const fetcher = async () => tweet
    const result = await computeQuoteExpansion(
      'https://x.com/me/status/111111111111111',
      fetcher
    )
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.changed).toBe(true)
    expect(result.nextBody).toContain(
      '[Discuss on X](https://x.com/me/status/111111111111111)'
    )
  })

  console.log('\nAll tests completed!')
}

main()
