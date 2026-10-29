import Link from "next/link";
import { eventsHref } from "@/lib/events/href";
import type { EventQuery, EventsPage } from "@/lib/events/types";

/**
 * Prev/Next paging over the feed. Availability is driven purely by the API's
 * `page`/`hasMore`, which never promise an empty page.
 */
export function Pagination({ query, page }: { query: EventQuery; page: EventsPage }) {
  const previous =
    page.page > 1
      ? eventsHref({
          keyword: query.keyword ?? undefined,
          city: query.city ?? undefined,
          category: query.category ?? undefined,
          startDate: query.startDate ?? undefined,
          endDate: query.endDate ?? undefined,
          page: page.page - 1,
          size: query.size,
        })
      : null;
  const next =
    page.hasMore
      ? eventsHref({
          keyword: query.keyword ?? undefined,
          city: query.city ?? undefined,
          category: query.category ?? undefined,
          startDate: query.startDate ?? undefined,
          endDate: query.endDate ?? undefined,
          page: page.page + 1,
          size: query.size,
        })
      : null;

  const controlClass =
    "rounded-lg border border-navy-700 bg-navy-800 px-4 py-2 text-sm text-ice/80 transition hover:border-indigo/70 hover:text-ice";
  const disabledClass = `${controlClass} pointer-events-none opacity-40`;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-2">
      {previous ? (
        <Link rel="prev" href={previous} className={controlClass}>
          ← Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          ← Previous
        </span>
      )}

      <p className="text-sm text-ice/60">Page {page.page}</p>

      {next ? (
        <Link rel="next" href={next} className={controlClass}>
          Next →
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          Next →
        </span>
      )}
    </nav>
  );
}
