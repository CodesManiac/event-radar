import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/events/route";
import { clearEventsCache } from "@/lib/events/service";

const BUSHDRUM_EVENT = {
  id: 1,
  title: "Nigeria Energy",
  url: "https://bushdrum.com/e/1",
  start_time: "2026-10-27T10:00:00",
  end_time: null,
  summary: "Energy industry gathering.",
  category: "conference",
  image_url: null,
  is_free: false,
  price_min: null,
  price_max: null,
  currency: null,
  venue: { name: "Eko Hotel", city: "lagos" },
};

const NAWHE_EVENT = {
  id: 76,
  slug: "the-headies",
  url: "https://nawhe.com/events/the-headies",
  title: "The Headies",
  summary: "African music awards.",
  category: "concerts-music",
  tags: [],
  status: "scheduled",
  start: "2026-12-10T18:00:00+01:00",
  end: null,
  timezone: "Africa/Lagos",
  image: { url: "https://nawhe.com/media/headies.webp" },
  location: { type: "physical", name: "Eko Convention Centre", city: "Lagos", country: "NG" },
  admission: {
    method: "external",
    price: { label: "₦20,000", mode: "fixed", currency: "NGN", min_minor: 2000000, max_minor: null },
  },
};

function handler(url: string): Response {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  if (url.startsWith("https://bushdrum.com/api/events")) {
    return json({ events: [BUSHDRUM_EVENT], total: 1 });
  }
  if (url.startsWith("https://bushdrum.com/api/filters")) {
    return json({ categories: [] });
  }
  if (url.startsWith("https://nawhe.com/api/v1/events")) {
    return json({
      data: [NAWHE_EVENT],
      meta: {
        api_version: "v1",
        contract: "nawhe.event",
        pagination: {
          page: 1,
          per_page: 50,
          total: 1,
          total_pages: 1,
          has_previous: false,
          has_next: false,
        },
        filters: {},
        result_window_limit: 500,
      },
    });
  }
  return json({ message: "unexpected url" }, 404);
}

function request(query: string): Request {
  return new Request(`http://localhost/api/events${query}`);
}

const fetchMock = vi.fn((input: unknown) => Promise.resolve(handler(String(input))));

beforeEach(() => {
  clearEventsCache();
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/events", () => {
  it("returns the documented response shape with merged, sorted events", async () => {
    const response = await GET(request("?size=10"));
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      events: Array<{ id: string; source: string; title: string; startDate: string }>;
      total: number;
      page: number;
      size: number;
      hasMore: boolean;
      sources: Array<{ source: string; state: string }>;
    };

    expect(Object.keys(body).sort()).toEqual(["events", "hasMore", "page", "size", "sources", "total"]);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.size).toBe(10);
    expect(body.hasMore).toBe(false);
    expect(body.sources).toEqual([
      { source: "bushdrum", state: "ok" },
      { source: "nawhe", state: "ok" },
    ]);
    // Sorted by start date: the October bushdrum event preceds the December one.
    expect(body.events.map((event) => event.id)).toEqual(["bushdrum:1", "nawhe:76"]);
  });

  it("keeps provider credentials and internals out of every response", async () => {
    const response = await GET(request("?size=10"));
    const text = await response.text();

    expect(text).not.toMatch(/apikey|api_key|token|secret|node_modules|\/Users\//i);
  });

  it("rejects invalid query parameters with HTTP 400 and a safe message", async () => {
    const response = await GET(request("?city=helsinki"));

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("invalid_query");
    expect(body.error.message).toContain("supported city");
    // Nothing was requested upstream for a rejected query.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects pages beyond the bounded window", async () => {
    const response = await GET(request("?page=99&size=50"));

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe("invalid_query");
  });

  it("maps total provider failure to HTTP 502 without leaking details", async () => {
    fetchMock.mockImplementation((input: unknown) =>
      String(input).startsWith("https://") ? Promise.reject(new Error("ECONNREFUSED 127.0.0.1")) : Promise.resolve(handler(String(input))),
    );

    const response = await GET(request("?keyword=crash"));

    expect(response.status).toBe(502);
    const text = await response.text();
    expect(text).toContain("provider_unavailable");
    expect(text).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|stack/i);
  });
});
