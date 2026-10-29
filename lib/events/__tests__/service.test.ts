import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderHttpError } from "../http";
import type { EventProvider, ProviderQuery, ProviderResult } from "../provider";
import { createEventsService, MAX_OFFSET } from "../service";
import { EventsError, type EventItem, type EventQuery } from "../types";

function event(source: string, id: string, startDate: string): EventItem {
  return {
    id: `${source}:${id}`,
    source,
    title: `Event ${id}`,
    description: null,
    imageUrl: null,
    startDate,
    endDate: null,
    timezone: null,
    venue: null,
    city: "Lagos",
    country: "NG",
    isOnline: null,
    category: "music",
    sourceCategory: "music",
    url: "https://example.com/event",
    priceMin: null,
    priceMax: null,
    currency: null,
    isFree: null,
  };
}

function stubProvider(
  source: string,
  events: EventItem[],
  options: { total?: number; failWith?: Error } = {},
): EventProvider & { calls: number } {
  const provider = {
    source,
    isAvailable: true,
    calls: 0,
    async fetchEvents(query: ProviderQuery): Promise<ProviderResult> {
      provider.calls += 1;
      if (options.failWith) throw options.failWith;
      return { events: events.slice(0, query.need), total: options.total ?? events.length };
    },
  };
  return provider;
}

function query(overrides: Partial<EventQuery> = {}): EventQuery {
  return {
    keyword: null,
    city: null,
    category: null,
    startDate: null,
    endDate: null,
    page: 1,
    size: 2,
    ...overrides,
  };
}

beforeEach(() => {
  // Provider failures are logged server-side; keep test output clean.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createEventsService", () => {
  it("merges providers into one feed sorted by start date", async () => {
    const service = createEventsService([
      stubProvider("alpha", [event("alpha", "a1", "2026-12-01T10:00:00+01:00")]),
      stubProvider("beta", [
        event("beta", "b1", "2026-11-01T10:00:00+01:00"),
        event("beta", "b2", "2026-11-15T10:00:00+01:00"),
      ]),
    ]);

    const page = await service.getEvents(query({ size: 10 }));

    expect(page.events.map((item) => item.id)).toEqual(["beta:b1", "beta:b2", "alpha:a1"]);
    expect(page.total).toBe(3);
    expect(page.hasMore).toBe(false);
    expect(page.sources).toEqual([
      { source: "alpha", state: "ok" },
      { source: "beta", state: "ok" },
    ]);
  });

  it("paginates without duplicates or gaps", async () => {
    const service = createEventsService([
      stubProvider("alpha", [
        event("alpha", "a1", "2026-11-01T10:00:00+01:00"),
        event("alpha", "a2", "2026-11-02T10:00:00+01:00"),
      ]),
      stubProvider("beta", [event("beta", "b1", "2026-11-03T10:00:00+01:00")]),
    ]);

    const first = await service.getEvents(query({ page: 1, size: 2 }));
    const second = await service.getEvents(query({ page: 2, size: 2 }));

    expect(first.events.map((item) => item.id)).toEqual(["alpha:a1", "alpha:a2"]);
    expect(first.hasMore).toBe(true);
    expect(second.events.map((item) => item.id)).toEqual(["beta:b1"]);
    expect(second.hasMore).toBe(false);

    const seen = new Set([...first.events, ...second.events].map((item) => item.id));
    expect(seen.size).toBe(3);
  });

  it("deduplicates repeated ids conservatively, never merging distinct events", async () => {
    const shared = event("alpha", "1", "2026-11-01T10:00:00+01:00");
    const service = createEventsService([
      stubProvider("alpha", [shared, { ...shared }]),
      // Same title and URL, different provider id → must stay distinct.
      stubProvider("beta", [{ ...event("beta", "1", "2026-11-01T10:00:00+01:00") }]),
    ]);

    const page = await service.getEvents(query({ size: 10 }));

    expect(page.events.map((item) => item.id)).toEqual(["alpha:1", "beta:1"]);
  });

  it("degrades to partial results when one provider fails", async () => {
    const service = createEventsService([
      stubProvider("alpha", [], { failWith: new ProviderHttpError("alpha", 500) }),
      stubProvider("beta", [event("beta", "b1", "2026-11-01T10:00:00+01:00")]),
    ]);

    const page = await service.getEvents(query());

    expect(page.events.map((item) => item.id)).toEqual(["beta:b1"]);
    expect(page.sources).toEqual([
      { source: "alpha", state: "error" },
      { source: "beta", state: "ok" },
    ]);
  });

  it("reports rate limiting distinctly when every provider is throttled", async () => {
    const service = createEventsService([
      stubProvider("alpha", [], { failWith: new ProviderHttpError("alpha", 429) }),
      stubProvider("beta", [], { failWith: new ProviderHttpError("beta", 429) }),
    ]);

    await expect(service.getEvents(query())).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("fails with provider_unavailable when no provider responds", async () => {
    const service = createEventsService([
      stubProvider("alpha", [], { failWith: new Error("socket hang up") }),
      stubProvider("beta", [], { failWith: new Error("dns failure") }),
    ]);

    await expect(service.getEvents(query())).rejects.toMatchObject({
      code: "provider_unavailable",
    });
  });

  it("caches responses and reuses in-flight requests", async () => {
    const alpha = stubProvider("alpha", [event("alpha", "a1", "2026-11-01T10:00:00+01:00")]);
    const service = createEventsService([alpha]);

    await service.getEvents(query());
    await service.getEvents(query());
    expect(alpha.calls).toBe(1);

    service.clearCache();
    await service.getEvents(query());
    expect(alpha.calls).toBe(2);
  });

  it("rejects pages beyond the bounded window", async () => {
    const service = createEventsService([stubProvider("alpha", [])]);
    const page = Math.floor(MAX_OFFSET / 10) + 3; // offset 210 at size 10
    await expect(service.getEvents(query({ page, size: 10 }))).rejects.toBeInstanceOf(EventsError);
  });
});
