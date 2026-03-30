const API = 'https://api.typefully.com'

function headers(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  }
}

export type TypefullyDraftListItem = {
  id: number
  social_set_id: number
  status: string
  scratchpad_text?: string | null
  x_published_url?: string | null
  linkedin_published_url?: string | null
  threads_published_url?: string | null
  bluesky_published_url?: string | null
  mastodon_published_url?: string | null
}

type ListResponse = {
  results?: TypefullyDraftListItem[]
  limit?: number
  offset?: number
  next?: string | null
}

export async function listTypefullyDraftsPage(
  socialSetId: string,
  apiKey: string,
  offset: number,
  limit: number
): Promise<TypefullyDraftListItem[]> {
  const q = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  })
  const res = await fetch(`${API}/v2/social-sets/${socialSetId}/drafts?${q}`, {
    headers: headers(apiKey),
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = (await res.json()) as ListResponse
  return data.results ?? []
}

export async function getTypefullyDraft(
  socialSetId: string,
  apiKey: string,
  draftId: number
): Promise<TypefullyDraftListItem | null> {
  const res = await fetch(`${API}/v2/social-sets/${socialSetId}/drafts/${draftId}`, {
    headers: headers(apiKey),
    cache: 'no-store',
  })
  if (!res.ok) return null
  return (await res.json()) as TypefullyDraftListItem
}
