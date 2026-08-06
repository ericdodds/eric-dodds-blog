import { cacheLife, cacheTag } from 'next/cache'

export const GITHUB_NOTES_CACHE_TAG = 'github-notes' as const

/**
 * Cache profile for notes data: fresh-on-refresh in dev (so new issues show up
 * immediately), hour-scale in production where the GitHub webhook invalidates
 * the tag on changes. Replaces the old fetch-level no-store/revalidate branch.
 * (Explicit branches because cacheLife's typed overloads reject union strings.)
 */
export function applyNotesCacheLife(): void {
  if (process.env.NODE_ENV === 'development') {
    cacheLife('seconds')
  } else {
    cacheLife('hours')
  }
}

export type GitHubNote = {
  id: number
  number: number
  title: string
  body: string | null
  html_url: string
  created_at: string
  updated_at: string
  labels: { name: string }[]
}

type GitHubIssueApi = GitHubNote & { pull_request?: unknown }

function getRepoParts(): { owner: string; repo: string } | null {
  const raw = process.env.NOTES_GITHUB_REPO?.trim()
  if (!raw) return null
  const parts = raw.split('/').filter(Boolean)
  if (parts.length !== 2) return null
  return { owner: parts[0], repo: parts[1] }
}

/** `NOTES_GITHUB_REPO` as `{ owner, repo }` for GraphQL and other call sites. */
export function getNotesGitHubRepo(): { owner: string; repo: string } | null {
  return getRepoParts()
}

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function passesPublishLabel(issue: GitHubNote, publishLabel: string | undefined, draftLabel: string | undefined): boolean {
  return passesPublishLabelFromLabels(issue.labels, publishLabel, draftLabel)
}

function passesPublishLabelFromLabels(
  labels: { name: string }[] | undefined,
  publishLabel: string | undefined,
  draftLabel: string | undefined
): boolean {
  if (draftLabel && labels?.some((l) => l.name === draftLabel)) return false
  if (!publishLabel) return true
  return labels?.some((l) => l.name === publishLabel) ?? false
}

/** GitHub Issues webhook `issue` payload (subset). */
export type GitHubWebhookIssue = {
  number: number
  title: string
  body: string | null
  html_url: string
  state: string
  labels?: { name: string }[]
  pull_request?: unknown
}

/** Same visibility rules as the /notes page (open issue, not a PR, optional publish/draft labels). */
export function issueIsVisibleAsNote(issue: GitHubWebhookIssue): boolean {
  if (issue.pull_request != null) return false
  if (issue.state !== 'open') return false
  return passesPublishLabelFromLabels(
    issue.labels,
    process.env.NOTES_PUBLISH_LABEL?.trim(),
    process.env.NOTES_DRAFT_LABEL?.trim()
  )
}

/** Name of the label that marks a note as an X quote-post (default: `x-quote`). */
export function getQuotePostLabelName(): string {
  return process.env.NOTES_QUOTE_POST_LABEL?.trim() || 'x-quote'
}

/** Does this set of labels mark the note as an X quote-post? */
export function hasQuotePostLabel(
  labels: { name: string }[] | null | undefined
): boolean {
  if (!labels?.length) return false
  const target = getQuotePostLabelName()
  return labels.some((l) => l.name === target)
}

/**
 * Name of the label marking a note whose X quote-post is already live on X;
 * such notes skip Typefully and get expanded from the X syndication API.
 * Default: `x-quote-posted`.
 */
export function getQuotePostedLabelName(): string {
  return process.env.NOTES_QUOTE_POSTED_LABEL?.trim() || 'x-quote-posted'
}

/** Does this set of labels mark the note as an already-posted X quote? */
export function hasQuotePostedLabel(
  labels: { name: string }[] | null | undefined
): boolean {
  if (!labels?.length) return false
  const target = getQuotePostedLabelName()
  return labels.some((l) => l.name === target)
}

export async function getNotes(): Promise<GitHubNote[]> {
  'use cache'
  cacheTag(GITHUB_NOTES_CACHE_TAG)
  applyNotesCacheLife()

  const repoParts = getRepoParts()
  const token = process.env.GITHUB_TOKEN?.trim()
  if (!repoParts || !token) return []

  const { owner, repo } = repoParts
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100&sort=created&direction=desc`

  const res = await fetch(url, { headers: githubHeaders(token) })

  if (!res.ok) {
    console.error('[github-notes] list failed', res.status, await res.text().catch(() => ''))
    return []
  }

  const data = (await res.json()) as GitHubIssueApi[]
  const publishLabel = process.env.NOTES_PUBLISH_LABEL?.trim()
  const draftLabel = process.env.NOTES_DRAFT_LABEL?.trim()

  return data
    .filter((item) => item.pull_request == null)
    .map(({ pull_request: _p, ...issue }) => issue as GitHubNote)
    .filter((issue) => passesPublishLabel(issue, publishLabel, draftLabel))
}

/**
 * Uncached fetch of a single note, for writers that must see GitHub's current
 * state immediately after a webhook event (previously `bypassDataCache: true`).
 */
export async function fetchNoteByNumberFresh(issueNumber: number): Promise<GitHubNote | null> {
  const repoParts = getRepoParts()
  const token = process.env.GITHUB_TOKEN?.trim()
  if (!repoParts || !token || !Number.isFinite(issueNumber)) return null

  const { owner, repo } = repoParts
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`

  const res = await fetch(url, {
    headers: githubHeaders(token),
    cache: 'no-store',
  })

  if (!res.ok) return null

  const issue = (await res.json()) as GitHubIssueApi
  if (issue.pull_request != null) return null

  const publishLabel = process.env.NOTES_PUBLISH_LABEL?.trim()
  const draftLabel = process.env.NOTES_DRAFT_LABEL?.trim()
  const note = issue as GitHubNote
  if (!passesPublishLabel(note, publishLabel, draftLabel)) return null

  return note
}

export async function getNoteByNumber(issueNumber: number): Promise<GitHubNote | null> {
  'use cache'
  cacheTag(GITHUB_NOTES_CACHE_TAG, `note-${issueNumber}`)
  applyNotesCacheLife()

  return fetchNoteByNumberFresh(issueNumber)
}
