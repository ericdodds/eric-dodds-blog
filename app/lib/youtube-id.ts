/** Extract YouTube video id from common URL shapes (watch, short links). */
export function extractYoutubeId(url: string): string | null {
  const trimmed = url.trim()
  const match = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([^&\n?#]+)/
  )
  return match ? match[1] : null
}
