import Link from "next/link";
import type { ReactNode } from "react";
import { eventsHref } from "@/lib/events/href";
import { sourceLabel } from "@/lib/events/taxonomy";
import type { EventQuery, EventsError, SourceStatus } from "@/lib/events/types";
import { RadarMark } from "./radar-mark";

function StateShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-700 bg-navy-800/60 px-6 py-14 text-center">
      <RadarMark className="mb-4 h-10 w-10 text-indigo/60" />
      <h3 className="text-lg font-semibold text-ice">{title}</h3>
      <div className="mt-2 max-w-md text-sm leading-relaxed text-ice/60">{children}</div>
    </div>
  );
}

/** No events matched the current filters (or the feed is simply empty). */
export function EmptyState({ query }: { query: EventQuery }) {
  const hasFilters = Boolean(
    query.keyword || query.city || query.category || query.startDate || query.endDate,
  );

  return (
    <StateShell title={hasFilters ? "No events match your filters" : "No events found yet"}>
      {hasFilters ? (
        <>
          <p>Nothing came back for this combination of search, city, and category.</p>
          <p className="mt-3">
            <Link
              href="/"
              className="text-indigo-300 underline decoration-indigo-300/40 underline-offset-2 hover:decoration-indigo-300"
            >
              Clear filters
            </Link>{" "}
            or try a broader search.
          </p>
        </>
      ) : (
        <p>The sources have no upcoming listings right now. Check back soon.</p>
      )}
    </StateShell>
  );
}

/**
 * A safe, expected failure from the events service (providers unreachable,
 * rate limited, or a filter the URL cannot satisfy).
 */
export function FeedErrorState({ error, query }: { error: EventsError; query?: EventQuery }) {
  const isInvalid = error.code === "invalid_query";
  const title = isInvalid ? "That filter combination isn’t valid" : "Couldn’t load events right now";
  const retryHref = query
    ? eventsHref({
        keyword: query.keyword ?? undefined,
        city: query.city ?? undefined,
        category: query.category ?? undefined,
        startDate: query.startDate ?? undefined,
        endDate: query.endDate ?? undefined,
        page: query.page,
      })
    : "/";

  return (
    <StateShell title={title}>
      <p>{error.message}</p>
      <p className="mt-3">
        {isInvalid ? (
          <Link
            href="/"
            className="text-indigo-300 underline decoration-indigo-300/40 underline-offset-2 hover:decoration-indigo-300"
          >
            Reset filters
          </Link>
        ) : (
          <a
            href={retryHref}
            className="text-indigo-300 underline decoration-indigo-300/40 underline-offset-2 hover:decoration-indigo-300"
          >
            Try again
          </a>
        )}
      </p>
    </StateShell>
  );
}

/** Banner shown when at least one provider failed but others succeeded. */
export function PartialResultsNotice({ sources }: { sources: SourceStatus[] }) {
  const rateLimited = sources.filter((source) => source.state === "rate-limited");
  const failed = sources.filter((source) => source.state === "error");

  const parts: string[] = [];
  if (failed.length > 0) {
    parts.push(`${failed.map((source) => sourceLabel(source.source)).join(" and ")} didn’t respond`);
  }
  if (rateLimited.length > 0) {
    parts.push(
      `${rateLimited.map((source) => sourceLabel(source.source)).join(" and ")} is receiving too many requests`,
    );
  }

  return (
    <p
      role="status"
      className="rounded-xl border-l-2 border-purple bg-purple/10 px-4 py-3 text-sm text-ice/80"
    >
      <strong className="font-semibold text-ice">Partial results.</strong> {parts.join("; ")}. Some
      events may be missing — try again shortly.
    </p>
  );
}
