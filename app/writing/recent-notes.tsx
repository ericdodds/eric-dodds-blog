import Link from 'next/link'
import { getNotes } from 'app/lib/github-notes'
import { formatDate } from 'app/blog/utils'

export async function RecentNotesSection() {
  const notes = await getNotes()
  const recentNotes = notes.slice(0, 5)

  if (recentNotes.length === 0) return null

  return (
    <div>
      {recentNotes.map((note) => (
        <Link
          key={note.id}
          className="mb-4 flex flex-col space-y-1"
          href={`/notes/${note.number}`}
        >
          <div className="flex w-full flex-col space-x-0 md:flex-row md:space-x-2">
            <p className="w-[180px] flex-shrink-0 tabular-nums text-neutral-600 dark:text-neutral-400">
              {formatDate(note.created_at, false)}
            </p>
            <p className="tracking-tight text-neutral-900 dark:text-neutral-100">
              {note.title}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
