/**
 * Events service: merges provider results into one normalized, sorted,
 * paginated feed.
 *
 * - Providers run in parallel; a failing provider degrades the feed to
 *   partial results (surfaced through `sources`) instead of failing the page.
 * - Pagination is bounded (PRD §10) and results are deduplicated on the
 *   normalized id, which is source-prefixed so distinct events are never
 *   merged across providers (PRD §6 "conservative deduplication").
 * - Successful responses are cached in-process for a short window, and
 *   identical concurrent requests share one provider round-trip.
 */

import { epochMs } from "./datetime";
import { isRateLimitError } from "./http";
import type { EventProvider } from "./provider";
import { bushdrumProvider } from "./providers/bushdrum";
import { nawheProvider } from "./providers/nawhe";
import { EventsError, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type EventItem, type EventQuery, type EventsPage } from "./types";

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };

/** Providers configured for this deployment (keyless, verified contracts). */
export const EVENT_PROVIDERS: EventProvider[] = [bushdrumProvider, nawheProvider];

/** Deepest reachable offset: 200 items across all providers combined. */
export const MAX_OFFSET = 200;

const DEFAULT_CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 100;

function byStartDate(left: EventItem, right: EventItem): number {
  const diff = epochMs(left.startDate) - epochMs(right.startDate);
  if (diff !== 0) return diff;
  // Stable tie-break so chunked provider pages paginate deterministically.
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export interface EventsService {
  getEvents(query: EventQuery): Promise<EventsPage>;
  clearCache(): void;
}

/**
 * Builds an events service over an explicit provider list. The production
 * singleton below uses the configured providers; tests inject stubs.
 */
export function createEventsService(
  providers: EventProvider[],
  options: { cacheTtlMs?: number } = {},
): EventsService {
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const responseCache = new Map<string, { page: EventsPage; expires: number }>();
  const inFlight = new Map<string, Promise<EventsPage>>();

  function readCache(key: string): EventsPage | null {
    const entry = responseCache.get(key);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      responseCache.delete(key);
      return null;
    }
    return entry.page;
  }

  function writeCache(key: string, page: EventsPage): void {
    if (responseCache.size >= CACHE_MAX_ENTRIES) {
      const oldest = responseCache.keys().next().value;
      if (oldest !== undefined) responseCache.delete(oldest);
    }
    responseCache.set(key, { page, expires: Date.now() + cacheTtlMs });
  }

  async function runProviders(query: EventQuery, need: number): Promise<EventsPage> {
    const offset = (query.page - 1) * query.size;

    const settled = await Promise.allSettled(
      providers.map((provider) =>
        provider.fetchEvents({
          keyword: query.keyword,
          cityId: query.city,
          category: query.category,
          startDate: query.startDate,
          endDate: query.endDate,
          need,
        }),
      ),
    );

    const merged = new Map<string, EventItem>();
    const sources: EventsPage["sources"] = [];
    let total = 0;
    let successCount = 0;
    let sawRateLimit = false;

    settled.forEach((result, index) => {
      const source = providers[index].source;

      if (result.status === "fulfilled") {
        successCount += 1;
        total += result.value.total;
        sources.push({ source, state: "ok" });
        for (const event of result.value.events) {
          if (!merged.has(event.id)) merged.set(event.id, event);
        }
        return;
      }

      const rateLimited = isRateLimitError(result.reason);
      sawRateLimit = sawRateLimit || rateLimited;
      sources.push({ source, state: rateLimited ? "rate-limited" : "error" });
      // Server-side diagnostics only; never returned to the client.
      console.error(`[events] provider "${source}" failed`, result.reason);
    });

    if (successCount === 0) {
      throw sawRateLimit
        ? new EventsError(
            "rate_limited",
            "The event sources are receiving too many requests right now. Please try again shortly.",
          )
        : new EventsError(
            "provider_unavailable",
            "We could not reach the event sources. Please try again shortly.",
          );
    }

    const events = [...merged.values()].sort(byStartDate).slice(offset, offset + query.size);

    return {
      events,
      total,
      page: query.page,
      size: query.size,
      // A page that came back short means the deduplicated merge is exhausted,
      // even when summed provider totals claim more — never promise a dead page.
      hasMore: events.length === query.size && offset + query.size < total,
      sources,
    };
  }

  return {
    async getEvents(query: EventQuery): Promise<EventsPage> {
      const offset = (query.page - 1) * query.size;
      if (offset > MAX_OFFSET) {
        throw new EventsError("invalid_query", "That page is beyond the available results.");
      }

      const key = JSON.stringify(query);
      const cached = readCache(key);
      if (cached) return cached;

      const pending = inFlight.get(key);
      if (pending) return pending;

      const task = runProviders(query, offset + query.size)
        .then((page) => {
          writeCache(key, page);
          return page;
        })
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, task);
      return task;
    },

    clearCache(): void {
      responseCache.clear();
      inFlight.clear();
    },
  };
}

export const eventsService = createEventsService(EVENT_PROVIDERS);

/** Returns one page of normalized events, or throws an `EventsError`. */
export function getEvents(query: EventQuery): Promise<EventsPage> {
  return eventsService.getEvents(query);
}

/** Clears cached responses (used by tests). */
export function clearEventsCache(): void {
  eventsService.clearCache();
}
