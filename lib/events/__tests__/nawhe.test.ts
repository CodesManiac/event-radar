import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, todayInAppZone } from "../datetime";
import type { ProviderQuery } from "../provider";
import { nawheProvider } from "../providers/nawhe";

function baseQuery(overrides: Partial<ProviderQuery> = {}): ProviderQuery {
  return {
    keyword: null,
    cityId: null,
    category: null,
    startDate: null,
    endDate: null,
    need: 20,
    ...overrides,
  };
}

function rawEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 82,
    slug: "erigga-the-genesis",
    url: "https://nawhe.com/events/erigga-the-genesis",
    title: "Erigga - The Genesis Continues",
    summary: "The next chapter unfolds in Port Harcourt.",
    category: "concerts-music",
    tags: [],
    status: "scheduled",
    start: "2026-11-20T18:00:00+01:00",
    end: null,
    timezone: "Africa/Lagos",
    image: { url: "https://nawhe.com/media/event.webp" },
    location: { type: "physical", name: "EUI Center", city: "Port Harcourt", country: "NG" },
    admission: {
      method: "external",
      price: { label: "From ₦5,000", mode: "from", currency: "NGN", min_minor: 500000, max_minor: null },
    },
    ...overrides,
  };
}

function payload(events: unknown[], paginationOverrides: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({
      data: events,
      meta: {
        api_version: "v1",
        contract: "nawhe.event",
        pagination: {
          page: 1,
          per_page: 50,
          total: events.length,
          total_pages: 1,
          has_previous: false,
          has_next: false,
          ...paginationOverrides,
        },
        filters: {},
        result_window_limit: 500,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function stubFetch(handler: () => Response): ReturnType<typeof vi.fn> {
  const mock = vi.fn(() => Promise.resolve(handler()));
  vi.stubGlobal("fetch", mock);
  return mock;
}

function requestedUrl(mock: ReturnType<typeof vi.fn>, call = 0): URL {
  return new URL(String(mock.mock.calls[call][0]));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("nawheProvider", () => {
  it("normalizes events, including minor-unit prices and explicit online flags", async () => {
    const mock = stubFetch(() => payload([rawEvent()]));

    const result = await nawheProvider.fetchEvents(baseQuery({ keyword: "erigga" }));

    expect(result.total).toBe(1);
    expect(result.events[0]).toMatchObject({
      id: "nawhe:82",
      source: "nawhe",
      title: "Erigga - The Genesis Continues",
      startDate: "2026-11-20T18:00:00+01:00",
      timezone: "Africa/Lagos",
      venue: "EUI Center",
      city: "Port Harcourt",
      country: "NG",
      category: "music",
      sourceCategory: "concerts-music",
      url: "https://nawhe.com/events/erigga-the-genesis",
      // Minor units convert to major units (NGN kobo → naira).
      priceMin: 5000,
      priceMax: null,
      currency: "NGN",
      isFree: false,
      // nawhe explicitly marks physical events, so online-ness is known.
      isOnline: false,
    });

    // Always scoped to Nigeria; keyword searches use the provider's own search.
    expect(requestedUrl(mock).searchParams.get("country")).toBe("NG");
    expect(requestedUrl(mock).searchParams.get("q")).toBe("erigga");
  });

  it("maps explicit free admission and absent admission correctly", async () => {
    stubFetch(() =>
      payload([
        rawEvent({
          id: 1,
          admission: {
            method: "nawhe_tickets",
            price: { label: "Free", mode: "free", currency: "NGN", min_minor: 0, max_minor: null },
          },
        }),
        rawEvent({ id: 2, admission: null }),
      ]),
    );

    const { events } = await nawheProvider.fetchEvents(baseQuery());

    expect(events[0]).toMatchObject({ isFree: true, priceMin: 0, priceMax: null });
    // Missing admission means unknown, never "free" (PRD §6).
    expect(events[1]).toMatchObject({ isFree: null, priceMin: null, priceMax: null, currency: null });
  });

  it("keeps online events honest and skips cancelled listings", async () => {
    stubFetch(() =>
      payload([
        rawEvent({
          id: 1,
          title: "Virtual Summit",
          location: { type: "online", name: null, city: null, country: null },
        }),
        rawEvent({ id: 2, location: { type: "mystery", name: "Somewhere", city: "Lagos", country: "NG" } }),
        rawEvent({ id: 3, status: "cancelled" }),
      ]),
    );

    const { events } = await nawheProvider.fetchEvents(baseQuery());

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ isOnline: true, venue: null, city: null, country: "NG" });
    expect(events[1]).toMatchObject({ isOnline: null });
  });

  it("degrades relative or non-http image URLs to null", async () => {
    stubFetch(() =>
      payload([
        rawEvent({ id: 1, image: { url: "media/relative.webp" } }),
        rawEvent({ id: 2, image: { url: "ftp://files.example.com/x.png" } }),
      ]),
    );

    const { events } = await nawheProvider.fetchEvents(baseQuery());

    expect(events).toHaveLength(2);
    expect(events[0]?.imageUrl).toBeNull();
    expect(events[1]?.imageUrl).toBeNull();
  });

  it("groups nawhe's Lagos districts under the Lagos filter", async () => {
    stubFetch(() =>
      payload([
        rawEvent({ id: 1, location: { type: "physical", name: "The Place", city: "Ikeja", country: "NG" } }),
        rawEvent({
          id: 2,
          location: { type: "physical", name: "EUI Center", city: "Port Harcourt", country: "NG" },
        }),
      ]),
    );

    const { events, total } = await nawheProvider.fetchEvents(baseQuery({ cityId: "lagos" }));

    expect(total).toBe(1);
    expect(events[0]?.city).toBe("Ikeja");
  });

  it("applies canonical category filters locally", async () => {
    stubFetch(() =>
      payload([
        rawEvent({ id: 1, category: "education-workshops" }),
        rawEvent({ id: 2, category: "concerts-music" }),
      ]),
    );

    const { events, total } = await nawheProvider.fetchEvents(baseQuery({ category: "education" }));

    expect(total).toBe(1);
    expect(events[0]?.sourceCategory).toBe("education-workshops");
  });

  it("filters dates locally, defaulting to upcoming events", async () => {
    const today = todayInAppZone();
    const events = [
      rawEvent({ id: 1, start: `${addDays(today, -3)}T10:00:00+01:00` }),
      rawEvent({ id: 2, start: `${addDays(today, 2)}T10:00:00+01:00` }),
      rawEvent({ id: 3, start: `${addDays(today, 40)}T10:00:00+01:00` }),
    ];

    stubFetch(() => payload(events));
    const upcoming = await nawheProvider.fetchEvents(baseQuery());
    expect(upcoming.total).toBe(2);
    expect(upcoming.events.map((event) => event.id)).toEqual(["nawhe:2", "nawhe:3"]);

    vi.unstubAllGlobals();
    stubFetch(() => payload(events));
    const ranged = await nawheProvider.fetchEvents(
      baseQuery({ startDate: addDays(today, 1), endDate: addDays(today, 7) }),
    );
    expect(ranged.total).toBe(1);
    expect(ranged.events[0]?.id).toBe("nawhe:2");
  });

  it("bounds materialisation to three pages even if the provider keeps paginating", async () => {
    const mock = stubFetch(() => payload([rawEvent()], { has_next: true, total: 999 }));

    await nawheProvider.fetchEvents(baseQuery());

    expect(mock).toHaveBeenCalledTimes(3);
    expect(requestedUrl(mock, 0).searchParams.get("page")).toBe("1");
    expect(requestedUrl(mock, 2).searchParams.get("page")).toBe("3");
  });

  it("truncates results to the requested need while reporting the full total", async () => {
    stubFetch(() => payload([rawEvent({ id: 1 }), rawEvent({ id: 2 }), rawEvent({ id: 3 })]));

    const result = await nawheProvider.fetchEvents(baseQuery({ need: 2 }));

    expect(result.events).toHaveLength(2);
    expect(result.total).toBe(3);
  });
});
