/**
 * Query-string serialization for the feed UI.
 *
 * The reverse of `parseEventQuery`: turns (partial) filter state into shareable
 * `/?...` URLs for links, chips, pagination, and the search form's JS
 * enhancement. Kept free of server-only imports so client components can use it.
 */

import { DEFAULT_PAGE_SIZE, type EventQuery } from "./types";

export type EventsHrefQuery = Partial<
  Pick<EventQuery, "keyword" | "city" | "category" | "startDate" | "endDate" | "page" | "size">
>;

/**
 * Builds an in-app href for the events feed. Defaults are omitted so URLs
 * stay clean (`/` rather than `/?page=1&size=20`); page 1 and page size are
 * normalized away, everything else is preserved verbatim.
 */
export function eventsHref(query: EventsHrefQuery): string {
  const params = new URLSearchParams();

  const keyword = query.keyword?.trim();
  if (keyword) params.set("keyword", keyword);
  if (query.city) params.set("city", query.city);
  if (query.category) params.set("category", query.category);
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.size && query.size !== DEFAULT_PAGE_SIZE) params.set("size", String(query.size));

  const search = params.toString();
  return search ? `/?${search}` : "/";
}
