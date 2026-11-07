import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { test } from 'node:test'
import { POST } from '../../api/typefully-webhook/route'
import { verifyTypefullyWebhook } from '../typefully-webhook'
import { buildNoteSocialBlock } from '../note-social-block'

const secret = 'test-webhook-secret'
const now = 1800000000
const body = '{"data":{"id":1,"social_set_id":2},"event":"draft.published"}'

function signedHeaders(rawBody: string, timestamp: number, key = secret) {
  return new Headers({
    'x-typefully-timestamp': String(timestamp),
    'x-typefully-signature': `sha256=${createHmac('sha256', key)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex')}`,
  })
}

test('accepts Typefully signatures over the exact raw body, including Unicode', () => {
  for (const raw of [body, '{ "text": "Hello 🌎" }']) {
    assert.equal(verifyTypefullyWebhook(raw, signedHeaders(raw, now), secret, now), true)
  }
})

test('rejects tampering, reserialized JSON, and the wrong secret', () => {
  const headers = signedHeaders(body, now)
  assert.equal(verifyTypefullyWebhook(body + ' ', headers, secret, now), false)
  assert.equal(verifyTypefullyWebhook(JSON.stringify(JSON.parse(body), null, 2), headers, secret, now), false)
  assert.equal(verifyTypefullyWebhook(body, headers, 'wrong', now), false)
  headers.set('x-typefully-timestamp', String(now - 1))
  assert.equal(verifyTypefullyWebhook(body, headers, secret, now), false)
})

test('allows the documented retry window and rejects stale or future signatures', () => {
  assert.equal(verifyTypefullyWebhook(body, signedHeaders(body, now - 3600), secret, now), true)
  for (const timestamp of [now - 3901, now + 301]) {
    assert.equal(verifyTypefullyWebhook(body, signedHeaders(body, timestamp), secret, now), false)
  }
})

test('rejects missing or malformed headers and legacy plaintext authentication', () => {
  for (const signature of ['', 'sha256=abc', `sha256=${'z'.repeat(64)}`, `sha256=${'a'.repeat(66)}`]) {
    const headers = signedHeaders(body, now)
    headers.set('x-typefully-signature', signature)
    assert.equal(verifyTypefullyWebhook(body, headers, secret, now), false)
  }
  for (const timestamp of ['', 'NaN', '1800000000.5', '99999999999999999999']) {
    const headers = signedHeaders(body, now)
    headers.set('x-typefully-timestamp', timestamp)
    assert.equal(verifyTypefullyWebhook(body, headers, secret, now), false)
  }
  const headers = new Headers({ authorization: `Bearer ${secret}`, 'x-typefully-webhook-secret': secret })
  assert.equal(verifyTypefullyWebhook(body, headers, secret, now), false)
  assert.equal(verifyTypefullyWebhook(body, signedHeaders(body, now), '', now), false)
})

test('route acknowledges unrelated drafts and ignores scheduled events without GitHub requests', async () => {
  const previousSecret = process.env.TYPEFULLY_WEBHOOK_SECRET
  const previousFetch = globalThis.fetch
  const previousSet = process.env.TYPEFULLY_SOCIAL_SET_ID
  process.env.TYPEFULLY_SOCIAL_SET_ID = '2'
  process.env.TYPEFULLY_WEBHOOK_SECRET = secret
  globalThis.fetch = async () => { throw new Error('Unexpected external request') }
  try {
    for (const scratchpad_text of [undefined, '', 'A post created in Typefully']) {
      const raw = JSON.stringify({ event: 'draft.published', data: { id: 1, social_set_id: 2, scratchpad_text } })
      const response = await POST(new Request('https://example.com/api/typefully-webhook', {
        method: 'POST', body: raw, headers: signedHeaders(raw, Math.floor(Date.now() / 1000)),
      }))
      assert.equal(response.status, 200)
      assert.equal((await response.json()).skip_reason, 'not a note draft')
    }
    const raw = JSON.stringify({ event: 'draft.scheduled' })
    const response = await POST(new Request('https://example.com/api/typefully-webhook', {
      method: 'POST', body: raw, headers: signedHeaders(raw, Math.floor(Date.now() / 1000)),
    }))
    assert.equal(response.status, 200)
    assert.equal((await response.json()).ignored, 'draft.scheduled')
  } finally {
    globalThis.fetch = previousFetch
    if (previousSet === undefined) delete process.env.TYPEFULLY_SOCIAL_SET_ID
    else process.env.TYPEFULLY_SOCIAL_SET_ID = previousSet
    if (previousSecret === undefined) delete process.env.TYPEFULLY_WEBHOOK_SECRET
    else process.env.TYPEFULLY_WEBHOOK_SECRET = previousSecret
  }
})

test('route rejects invalid signatures, JSON, payloads, and missing configuration', async () => {
  const previousSecret = process.env.TYPEFULLY_WEBHOOK_SECRET
  process.env.TYPEFULLY_WEBHOOK_SECRET = secret
  try {
    for (const [raw, key, status] of [[body, 'wrong', 401], ['{', secret, 400], ['null', secret, 400], ['[]', secret, 400], ['{"event":"draft.published"}', secret, 400]] as const) {
      const response = await POST(new Request('https://example.com/api/typefully-webhook', {
        method: 'POST', body: raw, headers: signedHeaders(raw, Math.floor(Date.now() / 1000), key),
      }))
      assert.equal(response.status, status)
    }
    delete process.env.TYPEFULLY_WEBHOOK_SECRET
    assert.equal((await POST(new Request('https://example.com/api/typefully-webhook', { method: 'POST', body }))).status, 503)
  } finally {
    if (previousSecret === undefined) delete process.env.TYPEFULLY_WEBHOOK_SECRET
    else process.env.TYPEFULLY_WEBHOOK_SECRET = previousSecret
  }
})

test('linked Notes drafts reach GitHub and real GitHub failures remain errors', async () => {
  const env = {
    TYPEFULLY_WEBHOOK_SECRET: secret,
    TYPEFULLY_SOCIAL_SET_ID: '2',
    NOTES_GITHUB_REPO: 'example/notes',
    GITHUB_TOKEN: 'test-token',
  }
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  const previousFetch = globalThis.fetch
  Object.assign(process.env, env)
  const url = 'https://x.com/example/status/123'
  const raw = JSON.stringify({ event: 'draft.published', data: {
    id: 1, social_set_id: 2,
    scratchpad_text: 'Source: https://github.com/example/notes/issues/42',
    x_published_url: url,
  } })
  try {
    for (const failPatch of [false, true]) {
      const calls: string[] = []
      globalThis.fetch = async (input, init) => {
        assert.equal(String(input), 'https://api.github.com/repos/example/notes/issues/42')
        calls.push(init?.method ?? 'GET')
        if (init?.method === 'PATCH') {
          assert.match(String(init.body), /Discuss on social/)
          return new Response('GitHub unavailable', { status: 503 })
        }
        return Response.json({ number: 42, body: failPatch ? 'A note' : buildNoteSocialBlock(1, [{ label: 'X', url }]) + '\n' })
      }
      const response = await POST(new Request('https://example.com/api/typefully-webhook', {
        method: 'POST', body: raw, headers: signedHeaders(raw, Math.floor(Date.now() / 1000)),
      }))
      assert.equal(response.status, failPatch ? 502 : 200)
      assert.deepEqual(calls, failPatch ? ['GET', 'PATCH'] : ['GET'])
      const result = await response.json()
      if (!failPatch) {
        assert.equal(result.issue, 42)
        assert.equal(result.updated, false)
      }
    }
  } finally {
    globalThis.fetch = previousFetch
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

async function withNotesEnvironment(fn: () => Promise<void>) {
  const env = {
    TYPEFULLY_WEBHOOK_SECRET: secret,
    TYPEFULLY_SOCIAL_SET_ID: '276617',
    TYPEFULLY_API_KEY: 'test-api-key',
    NOTES_GITHUB_REPO: 'example/notes',
    GITHUB_TOKEN: 'test-token',
    CRON_SECRET: 'test-cron-secret',
  }
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  const previousFetch = globalThis.fetch
  Object.assign(process.env, env)
  try { await fn() } finally {
    globalThis.fetch = previousFetch
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

async function deliver(data: Record<string, unknown>) {
  const raw = JSON.stringify({ event: 'draft.published', data })
  return POST(new Request('https://example.com/api/typefully-webhook', {
    method: 'POST', body: raw, headers: signedHeaders(raw, Math.floor(Date.now() / 1000)),
  }))
}

const publishedNote = {
  id: 123, social_set_id: 276617, status: 'published',
  scratchpad_text: 'Source: https://github.com/example/notes/issues/42',
  x_published_url: 'https://x.com/ericdodds/status/123',
  linkedin_published_url: 'https://www.linkedin.com/posts/example',
  substack_published_url: 'https://substack.com/@ericdodds/note/c-123',
}

const expectedSocialBlock = buildNoteSocialBlock(123, [
  { label: 'X', url: publishedNote.x_published_url },
  { label: 'LinkedIn', url: publishedNote.linkedin_published_url },
  { label: 'Substack', url: publishedNote.substack_published_url },
])

test('ignores the other account even with a Notes reference; missing account config fails closed', async () => {
  await withNotesEnvironment(async () => {
    globalThis.fetch = async () => { throw new Error('Must not access GitHub for another account') }
    for (const scratchpad_text of [null, publishedNote.scratchpad_text]) {
      const response = await deliver({ ...publishedNote, id: 11730952, social_set_id: 281331, scratchpad_text })
      assert.equal(response.status, 200)
      assert.equal((await response.json()).skip_reason, 'different social set')
    }
    delete process.env.TYPEFULLY_SOCIAL_SET_ID
    assert.equal((await deliver(publishedNote)).status, 503)
  })
})

test('Substack joins X and LinkedIn in GitHub and repeat webhooks do not rewrite the note', async () => {
  const { applyTypefullyPublishedLinksToGithubIssue } = await import('../apply-typefully-published-links')
  await withNotesEnvironment(async () => {
    let issueBody = 'Original note text'
    let patches = 0
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), 'https://api.github.com/repos/example/notes/issues/42')
      if (init?.method === 'PATCH') {
        issueBody = JSON.parse(String(init.body)).body
        patches++
      }
      return Response.json({ number: 42, body: issueBody })
    }
    const result = await applyTypefullyPublishedLinksToGithubIssue(publishedNote)
    assert.deepEqual(result, { ok: true, issueNumber: 42, updated: true })
    assert.equal(issueBody, `Original note text\n\n${expectedSocialBlock}\n`)
    const response = await deliver(publishedNote)
    assert.equal(response.status, 200)
    assert.equal((await response.json()).updated, false)
    assert.equal(patches, 1)
  })
})

test('backup sync preserves Substack links from both listing and detail responses', async () => {
  const { GET } = await import('../../api/cron/sync-published-note-links/route')
  await withNotesEnvironment(async () => {
    for (const needsDetail of [false, true]) {
      let detailCalls = 0
      globalThis.fetch = async (input, init) => {
        const url = String(input)
        assert.notEqual(init?.method, 'PATCH', 'Backfill must not remove an existing Substack link')
        if (url.includes('/drafts?')) {
          return Response.json({ results: [needsDetail ? { id: 123, status: 'published' } : publishedNote] })
        }
        if (url.endsWith('/drafts/123')) {
          detailCalls++
          return Response.json(publishedNote)
        }
        assert.equal(url, 'https://api.github.com/repos/example/notes/issues/42')
        return Response.json({ number: 42, body: `${expectedSocialBlock}\n` })
      }
      const response = await GET(new Request('https://example.com/api/cron/sync-published-note-links', {
        headers: { authorization: 'Bearer test-cron-secret' },
      }))
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { ok: true, scanned: 1, updated_issues: 0, issue_numbers: [] })
      assert.equal(detailCalls, needsDetail ? 1 : 0)
    }
  })
})

test('Substack-only notes work and missing Substack URLs add no empty link', async () => {
  const { collectPublishedPlatformLinks } = await import('../note-social-block')
  assert.deepEqual(collectPublishedPlatformLinks({ substack_published_url: publishedNote.substack_published_url }), [
    { label: 'Substack', url: publishedNote.substack_published_url },
  ])
  for (const substack_published_url of [undefined, null, '', '  ']) {
    assert.deepEqual(collectPublishedPlatformLinks({ x_published_url: publishedNote.x_published_url, substack_published_url }), [
      { label: 'X', url: publishedNote.x_published_url },
    ])
  }
})
