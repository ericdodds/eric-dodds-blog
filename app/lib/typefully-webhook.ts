import { createHmac, timingSafeEqual } from 'node:crypto'

// Typefully retries over one hour. Allow that window plus five minutes of skew.
const MAX_AGE_SECONDS = 65 * 60
const MAX_FUTURE_SECONDS = 5 * 60

/** Verify timestamp.rawBody as documented at https://typefully.com/docs/api. */
export function verifyTypefullyWebhook(
  body: string,
  headers: Headers,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const timestamp = headers.get('x-typefully-timestamp')
  const signature = headers.get('x-typefully-signature')
  if (!secret || !timestamp || !/^\d+$/.test(timestamp)) return false
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false

  const seconds = Number(timestamp)
  if (!Number.isSafeInteger(seconds)) return false
  const age = nowSeconds - seconds
  if (age > MAX_AGE_SECONDS || age < -MAX_FUTURE_SECONDS) return false

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest()
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'))
}
