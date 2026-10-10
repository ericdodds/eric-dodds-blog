import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { POST } from '../../api/subscribe/route'

const originalFetch = globalThis.fetch
const originalKey = process.env.RESEND_API_KEY
const originalSegment = process.env.RESEND_SEGMENT_ID

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-key'
  process.env.RESEND_SEGMENT_ID = 'test-segment'
})

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalKey === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = originalKey
  if (originalSegment === undefined) delete process.env.RESEND_SEGMENT_ID
  else process.env.RESEND_SEGMENT_ID = originalSegment
})

function request(body: unknown, origin = 'https://ericdodds.com') {
  return new Request('https://ericdodds.com/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin },
    body: JSON.stringify(body),
  })
}

test('rejects invalid emails, malformed JSON, and cross-origin submissions before calling Resend', async () => {
  globalThis.fetch = async () => { throw new Error('Unexpected Resend call') }
  for (const email of ['', 'invalid', null, 'a'.repeat(255)]) {
    assert.equal((await POST(request({ email }))).status, 400)
  }
  assert.equal((await POST(new Request('https://ericdodds.com/api/subscribe', { method: 'POST', body: '{' }))).status, 400)
  assert.equal((await POST(request({ email: 'reader@example.com' }, 'https://other.example'))).status, 403)
})

test('honeypot submissions never create a contact', async () => {
  globalThis.fetch = async () => { throw new Error('Unexpected Resend call') }
  assert.equal((await POST(request({ email: 'reader@example.com', website: 'spam' }))).status, 200)
})

test('missing configuration returns an actionable failure, not success', async () => {
  delete process.env.RESEND_API_KEY
  assert.equal((await POST(request({ email: 'reader@example.com' }))).status, 503)
})

test('normalizes a new email and creates a subscribed contact in the blog segment', async () => {
  const calls: Array<{ url: string; options?: RequestInit }> = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options })
    return calls.length === 1 ? new Response(null, { status: 404 }) : Response.json({ id: 'contact' })
  }
  assert.equal((await POST(request({ email: ' Reader@Example.com ', website: '' }))).status, 200)
  assert.equal(calls[0].url, 'https://api.resend.com/contacts/reader%40example.com')
  assert.equal(calls[1].url, 'https://api.resend.com/contacts')
  assert.equal(calls[1].options?.method, 'POST')
  assert.deepEqual(JSON.parse(calls[1].options?.body as string), {
    email: 'reader@example.com', unsubscribed: false, segments: [{ id: 'test-segment' }],
  })
})

test('repeat subscribers are added to the segment without recreating the contact', async () => {
  const urls: string[] = []
  globalThis.fetch = async (url) => {
    urls.push(String(url))
    return Response.json({ id: 'contact', unsubscribed: false })
  }
  assert.equal((await POST(request({ email: 'reader@example.com' }))).status, 200)
  assert.equal(urls.length, 2)
  assert.equal(urls[1], 'https://api.resend.com/contacts/reader%40example.com/segments/test-segment')
})

test('preserves global opt-outs', async () => {
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return Response.json({ id: 'contact', unsubscribed: true })
  }
  assert.equal((await POST(request({ email: 'reader@example.com' }))).status, 409)
  assert.equal(calls, 1)
})

test('provider failures and network errors do not report a successful subscription', async () => {
  for (const status of [401, 429, 500]) {
    globalThis.fetch = async () => new Response(null, { status })
    const response = await POST(request({ email: 'reader@example.com' }))
    assert.equal(response.status, status === 429 ? 429 : 502)
    assert.deepEqual(await response.json(), { error: 'Unable to subscribe right now. Please try again later.' })
  }
  let calls = 0
  globalThis.fetch = async () => ++calls === 1 ? new Response(null, { status: 404 }) : new Response(null, { status: 500 })
  assert.equal((await POST(request({ email: 'reader@example.com' }))).status, 502)
  globalThis.fetch = async () => { throw new Error('Network error') }
  assert.equal((await POST(request({ email: 'reader@example.com' }))).status, 502)
})
