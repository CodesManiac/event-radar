/**
 * Provider abstraction (PRD §6 "Provider abstraction").
 *
 * A provider receives normalized search parameters and resolves with
 * normalized events plus the total number of matching items it knows about.
 *
 * Providers do their own upstream pagination internally: the service asks for
 * "the first `need` matching items" and merges the results.
 */

import type { EventCategory, EventItem } from "./types";

export interface ProviderQuery {
  keyword: string | null;
  /** Canonical city filter; null means all of Nigeria. */
  cityId: string | null;
  category: EventCategory | null;
  /** Inclusive `YYYY-MM-DD` lower bound. */
  startDate: string | null;
  /** Inclusive `YYYY-MM-DD` upper bound. */
  endDate: string | null;
  /** Number of leading items required from this provider. */
  need: number;
}

export interface ProviderResult {
  events: EventItem[];
  /** Total matching items known to the provider for this query. */
  total: number;
}

export interface EventProvider {
  readonly source: string;
  /** True when the provider can answer queries without extra configuration. */
  readonly isAvailable: boolean;
  fetchEvents(query: ProviderQuery): Promise<ProviderResult>;
}
