export function RecentNotesFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading notes">
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-4 flex flex-col gap-1 md:flex-row md:gap-2">
          <div className="h-4 w-[180px] flex-shrink-0 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 max-w-md flex-1 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ))}
    </div>
  )
}
