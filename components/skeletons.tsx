/**
 * Skeleton placeholders for the feed (PRD §7 loading states).
 *
 * Used as the route-level `loading.tsx`, the page-level Suspense fallback,
 * and the in-page fallback while results stream in. The live region sits on
 * the outermost element of each export so nested fallbacks never stack
 * duplicate announcements.
 */

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy-700 bg-navy-800">
      <div className="h-44 w-full animate-pulse bg-navy-700/60" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-2/5 animate-pulse rounded bg-navy-700/60" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-navy-700/60" />
        <div className="h-3 w-full animate-pulse rounded bg-navy-700/40" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-navy-700/40" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-navy-700/60" />
          <div className="h-3 w-16 animate-pulse rounded bg-navy-700/40" />
        </div>
      </div>
    </div>
  );
}

function ResultsGridSkeleton() {
  return (
    <>
      <div className="h-5 w-44 animate-pulse rounded bg-navy-700/60" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </>
  );
}

/** Skeleton for the results column only. */
export function ResultsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <span className="sr-only">Loading events…</span>
      <ResultsGridSkeleton />
    </div>
  );
}

/** Skeleton mirroring the full explorer layout: filters + results. */
export function FeedSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start"
    >
      <span className="sr-only">Loading events…</span>
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-xl border border-navy-700 bg-navy-800" />
        <div className="space-y-2">
          <div className="h-3 w-12 animate-pulse rounded bg-navy-700/60" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-8 w-24 animate-pulse rounded-full border border-navy-700 bg-navy-800" />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-16 animate-pulse rounded bg-navy-700/60" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-8 w-20 animate-pulse rounded-full border border-navy-700 bg-navy-800" />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-5">
        <ResultsGridSkeleton />
      </div>
    </div>
  );
}
