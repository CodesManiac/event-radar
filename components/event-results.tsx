import type { ReactNode } from "react";
import { connection } from "next/server";
import { getEvents } from "@/lib/events/service";
import { categoryLabel, findCity } from "@/lib/events/taxonomy";
import { EventsError, type EventQuery, type EventsPage } from "@/lib/events/types";
import { EventCard } from "./event-card";
import { EmptyState, FeedErrorState, PartialResultsNotice } from "./feed-states";
import { Pagination } from "./pagination";

/**
 * Server-rendered result set for one parsed query: fetches from the events
 * service, then renders the partial-results notice, grid, empty/error states,
 * and pagination. Expected service failures degrade to friendly inline states;
 * unexpected errors propagate to the route's error boundary.
 */
export async function EventResults({ query }: { query: EventQuery }): Promise<ReactNode> {
  // Mark the provider fetch as request-time data (Cache Components): during
  // shell prerendering this suspends the boundary instead of running the
  // fetch — and the service cache's wall clock — at build/prerender time.
  await connection();

  let page: EventsPage;
  try {
    page = await getEvents(query);
  } catch (error) {
    if (error instanceof EventsError) return <FeedErrorState error={error} query={query} />;
    throw error;
  }

  const degraded = page.sources.filter((source) => source.state !== "ok");

  if (page.events.length === 0) {
    return (
      <div className="space-y-6">
        {degraded.length > 0 && <PartialResultsNotice sources={degraded} />}
        <EmptyState query={query} />
      </div>
    );
  }

  const scope: string[] = [];
  if (query.city) scope.push(` in ${findCity(query.city)?.label ?? query.city}`);
  if (query.category) scope.push(` · ${categoryLabel(query.category)}`);

  return (
    <div className="space-y-6">
      {degraded.length > 0 && <PartialResultsNotice sources={degraded} />}

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold text-ice">
          {page.total.toLocaleString("en-NG")} {page.total === 1 ? "event" : "events"}{" "}
          <span className="font-normal text-ice/55">{scope.join("").trim()}</span>
        </h2>
        <p className="text-sm text-ice/50">Sorted by soonest first</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {page.events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      <Pagination query={query} page={page} />
    </div>
  );
}
