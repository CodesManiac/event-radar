import { describe, expect, it } from "vitest";
import { eventsHref } from "../href";

describe("eventsHref", () => {
  it("returns the bare path when every parameter is a default", () => {
    expect(eventsHref({})).toBe("/");
    expect(eventsHref({ page: 1, size: 20 })).toBe("/");
  });

  it("omits page 1 and the default size but keeps real filters", () => {
    expect(eventsHref({ keyword: "concert", city: "lagos", page: 1, size: 20 })).toBe(
      "/?keyword=concert&city=lagos",
    );
  });

  it("keeps deeper pages and non-default sizes", () => {
    expect(eventsHref({ page: 3, size: 30 })).toBe("/?page=3&size=30");
  });

  it("serializes every filter dimension with URL encoding", () => {
    const href = eventsHref({
      keyword: "open mic night",
      city: "port-harcourt",
      category: "arts-entertainment",
      startDate: "2026-11-01",
      endDate: "2026-11-30",
      page: 2,
    });
    const params = new URLSearchParams(href.slice(2));
    expect(params.get("keyword")).toBe("open mic night");
    expect(params.get("city")).toBe("port-harcourt");
    expect(params.get("category")).toBe("arts-entertainment");
    expect(params.get("startDate")).toBe("2026-11-01");
    expect(params.get("endDate")).toBe("2026-11-30");
    expect(params.get("page")).toBe("2");
  });

  it("drops whitespace-only keywords instead of emitting an empty param", () => {
    expect(eventsHref({ keyword: "   " })).toBe("/");
    expect(eventsHref({ keyword: "  jazz  " })).toBe("/?keyword=jazz");
  });
});
