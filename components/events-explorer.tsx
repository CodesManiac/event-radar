import { Suspense } from "react";
import type { ReactNode } from "react";
import { eventsHref } from "@/lib/events/href";
import { parseEventQuery, toURLSearchParams } from "@/lib/events/query";
import { EventsError, type EventQuery } from "@/lib/events/types";
import { EventFilters } from "./event-filters";
import { EventResults } from "./event-results";
import { FeedErrorState } from "./feed-states";
import { ResultsSkeleton } from "./skeletons";

interface EventsExplorerProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The interactive feed area.
 *
 * Awaits the page's `searchParams` promise (kept below the page's Suspense
 * boundary so the hero renders as part of the static shell), validates the
 * parameters through the same parser as `GET /api/events`, renders the filter
 * sidebar immediately, and streams results in a nested Suspense boundary whose
 * key changes with the query — so every navigation shows a fresh skeleton
 * rather than stale events.
 */
export async function EventsExplorer({ searchParams }: EventsExplorerProps): Promise<ReactNode> {
  const params = await searchParams;

  let query: EventQuery;
  try {
    query = parseEventQuery(toURLSearchParams(params));
  } catch (error) {
    if (error instanceof EventsError) {
      return <FeedErrorState error={error} />;
    }
    throw error;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <EventFilters query={query} />
      </div>
      <Suspense fallback={<ResultsSkeleton />} key={eventsHref(query)}>
        <EventResults query={query} />
      </Suspense>
    </div>
  );
}
