/**
 * Canonical event model shared by every provider adapter and the UI.
 *
 * Every field is either mapped from real provider data or explicitly null.
 * Nothing in this model is inferred from missing data (see PRD §6).
 */

/** Canonical, provider-independent category taxonomy. */
export const EVENT_CATEGORIES = [
  "music",
  "sports",
  "arts-entertainment",
  "business",
  "education",
  "technology",
  "workshops",
  "community",
  "other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/** Normalized event, identical in shape regardless of the upstream source. */
export interface EventItem {
  /** Normalized identifier: `${source}:${providerEventId}`. */
  id: string;
  /** Provider key, e.g. "bushdrum" or "nawhe". */
  source: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  /** ISO 8601 start date/time (offset-qualified when the provider exposes a time zone). */
  startDate: string;
  endDate: string | null;
  timezone: string | null;
  venue: string | null;
  city: string | null;
  country: string;
  /** True only when the provider explicitly marks the event as online. */
  isOnline: boolean | null;
  category: EventCategory;
  /** Original provider category value, kept for provenance. */
  sourceCategory: string | null;
  /** Canonical event page on the provider/organizer site. */
  url: string;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  /** True/false only when the provider states it; otherwise null. */
  isFree: boolean | null;
}

/** Normalized search parameters accepted by the service layer. */
export interface EventQuery {
  /** Free-text search over event title/keywords. */
  keyword: string | null;
  /** Canonical city id from {@link NIGERIAN_CITIES}; null means all of Nigeria. */
  city: string | null;
  category: EventCategory | null;
  /** Inclusive lower bound, `YYYY-MM-DD`. */
  startDate: string | null;
  /** Inclusive upper bound, `YYYY-MM-DD`. */
  endDate: string | null;
  /** 1-based page number. */
  page: number;
  size: number;
}

/**
 * Default/max page sizes (PRD §10 bounds). Defined in this leaf module so
 * both server code and client components can import them without dragging
 * provider/network code into the browser bundle.
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export type SourceState = "ok" | "error" | "rate-limited";
export interface SourceStatus {
  source: string;
  state: SourceState;
}

export interface EventsPage {
  events: EventItem[];
  total: number;
  page: number;
  size: number;
  hasMore: boolean;
  /** Per-provider outcome so the UI can surface partial results honestly. */
  sources: SourceStatus[];
}

export type EventsErrorCode =
  | "invalid_query"
  | "provider_unavailable"
  | "rate_limited";

/** Safe, user-facing failure raised by the events service. */
export class EventsError extends Error {
  readonly code: EventsErrorCode;

  constructor(code: EventsErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EventsError";
    this.code = code;
  }
}
