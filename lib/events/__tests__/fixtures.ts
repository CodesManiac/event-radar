/**
 * Shared builders for UI/serialization tests. Not a test file itself (no
 * `.test.` segment), so the runner does not collect it.
 */

import type { EventItem, EventQuery, EventsPage } from "../types";

export function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: "bushdrum:1",
    source: "bushdrum",
    title: "Nigeria Energy Week",
    description: "Energy industry gathering.",
    imageUrl: null,
    startDate: "2026-11-03T10:00:00+01:00",
    endDate: null,
    timezone: "Africa/Lagos",
    venue: "Eko Hotel",
    city: "Lagos",
    country: "NG",
    isOnline: null,
    category: "business",
    sourceCategory: "conference",
    url: "https://bushdrum.com/e/1",
    priceMin: null,
    priceMax: null,
    currency: null,
    isFree: null,
    ...overrides,
  };
}

export function makeQuery(overrides: Partial<EventQuery> = {}): EventQuery {
  return {
    keyword: null,
    city: null,
    category: null,
    startDate: null,
    endDate: null,
    page: 1,
    size: 20,
    ...overrides,
  };
}

export function makePage(
  overrides: Partial<EventsPage> = {},
  events: EventItem[] = [makeEvent()],
): EventsPage {
  return {
    events,
    total: events.length,
    page: 1,
    size: 20,
    hasMore: false,
    sources: [{ source: "bushdrum", state: "ok" }],
    ...overrides,
  };
}
