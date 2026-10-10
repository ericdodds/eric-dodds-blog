import { z } from 'zod'

const subscription = z.object({
  email: z.string().trim().max(254).pipe(z.email()).transform((email) => email.toLowerCase()),
  website: z.string().max(254).optional(),
})

const unavailable = 'Unable to subscribe right now. Please try again later.'

export async function POST(request: Request) {
  // Only accept submissions from the site, including preview deployments.
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Please subscribe using the form on this site.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const parsed = subscription.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (parsed.data.website) return Response.json({ success: true })

  const apiKey = process.env.RESEND_API_KEY
  const segmentId = process.env.RESEND_SEGMENT_ID
  if (!apiKey || !segmentId) {
    return Response.json({ error: unavailable }, { status: 503 })
  }

  const { email } = parsed.data
  const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  const contactUrl = `https://api.resend.com/contacts/${encodeURIComponent(email)}`

  try {
    const contact = await fetch(contactUrl, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000) })
    let response: Response
    if (contact.ok) {
      const existing = await contact.json()
      // Preserve an existing opt-out instead of changing global subscription preferences.
      if (existing.unsubscribed) {
        return Response.json({ error: 'This address has previously unsubscribed. Please contact me to subscribe again.' }, { status: 409 })
      }
      response = await fetch(`${contactUrl}/segments/${encodeURIComponent(segmentId)}`, {
        method: 'POST', headers, signal: AbortSignal.timeout(10000),
      })
    } else if (contact.status === 404) {
      response = await fetch('https://api.resend.com/contacts', {
        method: 'POST', headers,
        body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: segmentId }] }),
        signal: AbortSignal.timeout(10000),
      })
    } else {
      return Response.json({ error: unavailable }, { status: contact.status === 429 ? 429 : 502 })
    }

    if (!response.ok) {
      return Response.json({ error: unavailable }, { status: response.status === 429 ? 429 : 502 })
    }
    return Response.json({ success: true })
  } catch {
    return Response.json({ error: unavailable }, { status: 502 })
  }
}
