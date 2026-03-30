import { getNotesGitHubRepo } from 'app/lib/github-notes'

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export function notesRepoMatchesRef(owner: string, repo: string): boolean {
  const parts = getNotesGitHubRepo()
  if (!parts) return false
  return (
    parts.owner.toLowerCase() === owner.toLowerCase() &&
    parts.repo.toLowerCase() === repo.toLowerCase()
  )
}

export type GithubIssueWriteMeta = { body: string | null; number: number }

export async function fetchGithubIssueForPatch(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GithubIssueWriteMeta | null> {
  const token = process.env.GITHUB_TOKEN?.trim()
  if (!token) return null

  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`
  const res = await fetch(url, {
    headers: githubHeaders(token),
    cache: 'no-store',
  })

  if (!res.ok) return null
  const data = (await res.json()) as { body?: string | null; number?: number }
  return { body: data.body ?? null, number: data.number ?? issueNumber }
}

export async function patchGithubIssueBody(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const token = process.env.GITHUB_TOKEN?.trim()
  if (!token) {
    return { ok: false, status: 503, message: 'GITHUB_TOKEN not configured' }
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      ...githubHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    return { ok: false, status: res.status, message: errText.slice(0, 400) }
  }

  return { ok: true }
}
