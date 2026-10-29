import { afterEach, describe, expect, it, vi } from "vitest";
import { todayInAppZone } from "../datetime";
import { ProviderHttpError, ProviderResponseError } from "../http";
import type { ProviderQuery } from "../provider";
import { bushdrumProvider } from "../providers/bushdrum";

function baseQuery(overrides: Partial<ProviderQuery> = {}): ProviderQuery {
  return {
    keyword: null,
    cityId: "lagos",
    category: null,
    startDate: null,
    endDate: null,
    need: 20,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function rawEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 42,
    title: "LIPFest Opening Ceremony",
    url: "https://bushdrum.com/e/42",
    start_time: "2026-10-22T11:00:00",
    end_time: null,
    summary: "Opening ceremony and workshops",
    category: "festival",
    image_url: "https://cdn-ip.allevents.in/thumb.jpg",
    is_free: false,
    price_min: 5000,
    price_max: null,
    currency: "NGN",
    venue: { name: "Freedom Park", city: "lagos" },
    ...overrides,
  };
}

function stubFetch(handler: (url: string) => Response): ReturnType<typeof vi.fn> {
  const mock = vi.fn((input: unknown) => Promise.resolve(handler(String(input))));
  vi.stubGlobal("fetch", mock);
  return mock;
}

function firstRequestUrl(mock: ReturnType<typeof vi.fn>): string {
  return String(mock.mock.calls[0][0]);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("bushdrumProvider", () => {
  it("normalizes a full event and scopes the request to a Nigerian city", async () => {
    const mock = stubFetch(() => jsonResponse({ events: [rawEvent()], total: 1 }));

    const result = await bushdrumProvider.fetchEvents(baseQuery({ keyword: "fest" }));

    expect(result.total).toBe(1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      id: "bushdrum:42",
      source: "bushdrum",
      title: "LIPFest Opening Ceremony",
      description: "Opening ceremony and workshops",
      imageUrl: "https://cdn-ip.allevents.in/thumb.jpg",
      startDate: "2026-10-22T11:00:00+01:00",
      endDate: null,
      timezone: "Africa/Lagos",
      venue: "Freedom Park",
      city: "Lagos",
      country: "NG",
      // bushdrum exposes no explicit online flag, so it stays unknown.
      isOnline: null,
      category: "arts-entertainment",
      sourceCategory: "festival",
      url: "https://bushdrum.com/e/42",
      priceMin: 5000,
      priceMax: null,
      currency: "NGN",
      isFree: false,
    });

    const url = new URL(firstRequestUrl(mock));
    expect(url.searchParams.get("city")).toBe("lagos");
    expect(url.searchParams.get("q")).toBe("fest");
    expect(url.searchParams.get("sort")).toBe("date_asc");
    // Upcoming events by default: date_from is always sent.
    expect(url.searchParams.get("date_from")).toBe(todayInAppZone());
    expect(url.searchParams.get("date_to")).toBeNull();
  });

  it("passes explicit date bounds through to the provider", async () => {
    const mock = stubFetch(() => jsonResponse({ events: [], total: 0 }));

    await bushdrumProvider.fetchEvents(baseQuery({ startDate: "2026-11-01", endDate: "2026-11-30" }));

    const url = new URL(firstRequestUrl(mock));
    expect(url.searchParams.get("date_from")).toBe("2026-11-01");
    expect(url.searchParams.get("date_to")).toBe("2026-11-30");
  });

  it("degrades missing optional fields to null instead of dropping the event", async () => {
    stubFetch(() =>
      jsonResponse({
        events: [
          rawEvent({
            summary: null,
            image_url: null,
            venue: null,
            price_min: null,
            price_max: null,
            currency: null,
            is_free: null,
          }),
        ],
        total: 1,
      }),
    );

    const { events } = await bushdrumProvider.fetchEvents(baseQuery());

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      description: null,
      imageUrl: null,
      venue: null,
      city: "Lagos",
      priceMin: null,
      priceMax: null,
      currency: null,
      isFree: null,
    });
  });

  it("skips records that cannot be displayed honestly", async () => {
    stubFetch(() =>
      jsonResponse({
        events: [
          rawEvent({ id: 1, title: "" }),
          rawEvent({ id: 2, url: null }),
          rawEvent({ id: 3, start_time: "TBD" }),
          rawEvent({ id: 4, url: "/events/4" }),
          rawEvent({ id: 5, url: "javascript:alert(1)" }),
        ],
        total: 5,
      }),
    );

    const result = await bushdrumProvider.fetchEvents(baseQuery());

    expect(result.events).toHaveLength(0);
    // The provider still knows about them; we just refuse to fabricate cards.
    expect(result.total).toBe(5);
  });

  it("degrades a garbage image URL to null instead of a link to our own origin", async () => {
    // Live payload observation: a bushdrum image_url of just "COA".
    stubFetch(() =>
      jsonResponse({ events: [rawEvent({ image_url: "COA" })], total: 1 }),
    );

    const { events } = await bushdrumProvider.fetchEvents(baseQuery());

    expect(events).toHaveLength(1);
    expect(events[0].imageUrl).toBeNull();
  });

  it("translates canonical categories into the provider's comma-separated OR filter", async () => {
    const mock = stubFetch(() => jsonResponse({ events: [rawEvent()], total: 1 }));

    await bushdrumProvider.fetchEvents(baseQuery({ category: "arts-entertainment" }));

    expect(new URL(firstRequestUrl(mock)).searchParams.get("category")).toBe(
      "nightlife,film,theater,comedy,art,festival",
    );
  });

  it("returns nothing without calling the API for categories it cannot filter", async () => {
    const mock = stubFetch(() => jsonResponse({ events: [], total: 0 }));

    const result = await bushdrumProvider.fetchEvents(baseQuery({ category: "other" }));

    expect(result).toEqual({ events: [], total: 0 });
    expect(mock).not.toHaveBeenCalled();
  });

  it("does not invent city coverage: unsupported cities return empty without a request", async () => {
    const mock = stubFetch(() => jsonResponse({ events: [rawEvent()], total: 1 }));

    const result = await bushdrumProvider.fetchEvents(baseQuery({ cityId: "port-harcourt" }));

    expect(result).toEqual({ events: [], total: 0 });
    expect(mock).not.toHaveBeenCalled();
  });

  it("chunks large requests within the documented per_page limit", async () => {
    const total = 125;
    const pageOne = Array.from({ length: 100 }, (_, index) => rawEvent({ id: index + 1 }));
    const pageTwo = Array.from({ length: 20 }, (_, index) => rawEvent({ id: 101 + index }));
    const mock = stubFetch((url) => {
      const page = new URL(url).searchParams.get("page");
      return jsonResponse({ events: page === "1" ? pageOne : pageTwo, total });
    });

    const result = await bushdrumProvider.fetchEvents(baseQuery({ need: 120 }));

    expect(mock).toHaveBeenCalledTimes(2);
    const perPages = mock.mock.calls.map((call) => Number(new URL(String(call[0])).searchParams.get("per_page")));
    expect(perPages).toEqual([100, 20]);
    expect(result.events).toHaveLength(120);
    // The city total is reported once, not once per chunk.
    expect(result.total).toBe(total);
  });

  it("surfaces HTTP failures and malformed payloads", async () => {
    stubFetch(() => jsonResponse({ message: "boom" }, 500));
    await expect(bushdrumProvider.fetchEvents(baseQuery())).rejects.toBeInstanceOf(ProviderHttpError);

    vi.unstubAllGlobals();
    stubFetch(() => new Response("not json", { status: 200 }));
    await expect(bushdrumProvider.fetchEvents(baseQuery())).rejects.toBeInstanceOf(ProviderResponseError);

    vi.unstubAllGlobals();
    stubFetch(() => jsonResponse({ events: {}, total: "many" }));
    await expect(bushdrumProvider.fetchEvents(baseQuery())).rejects.toBeInstanceOf(ProviderResponseError);
  });
});
