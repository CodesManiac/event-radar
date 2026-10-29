import { describe, expect, it } from "vitest";
import { parseEventQuery, toURLSearchParams } from "../query";
import { EventsError } from "../types";

function parse(query: string): ReturnType<typeof parseEventQuery> {
  return parseEventQuery(new URLSearchParams(query));
}

function expectInvalidQuery(query: string): EventsError {
  try {
    parse(query);
  } catch (error) {
    expect(error).toBeInstanceOf(EventsError);
    expect((error as EventsError).code).toBe("invalid_query");
    return error as EventsError;
  }
  throw new Error(`expected "${query}" to be rejected`);
}

describe("parseEventQuery", () => {
  it("applies defaults for an empty query", () => {
    expect(parse("")).toEqual({
      keyword: null,
      city: null,
      category: null,
      startDate: null,
      endDate: null,
      page: 1,
      size: 20,
    });
  });

  it("reads and trims supported parameters", () => {
    const query = parse(
      "keyword=%20concert%20&city=lagos&category=music&startDate=2026-10-20&endDate=2026-10-31&page=2&size=10",
    );
    expect(query).toEqual({
      keyword: "concert",
      city: "lagos",
      category: "music",
      startDate: "2026-10-20",
      endDate: "2026-10-31",
      page: 2,
      size: 10,
    });
  });

  it("treats blank values as absent", () => {
    expect(parse("keyword=+++&city=&category=").keyword).toBeNull();
  });

  it("rejects malformed numbers", () => {
    expectInvalidQuery("page=abc");
    expectInvalidQuery("page=0");
    expectInvalidQuery("size=0");
    expectInvalidQuery("size=51");
  });

  it("rejects unsupported cities and categories", () => {
    expectInvalidQuery("city=helsinki");
    expectInvalidQuery("category=other");
    expectInvalidQuery("category=parties-nightlife");
  });

  it("rejects malformed or inverted date ranges", () => {
    expectInvalidQuery("startDate=2026-13-01");
    expectInvalidQuery("startDate=20/10/2026");
    expectInvalidQuery("startDate=1999-01-01");
    expectInvalidQuery("startDate=2026-10-31&endDate=2026-10-01");
  });

  it("rejects overly long keywords", () => {
    expectInvalidQuery(`keyword=${"a".repeat(101)}`);
  });

  it("never exposes internals in the error message", () => {
    const error = expectInvalidQuery("city=helsinki");
    expect(error.message).not.toMatch(/stack|node_modules|\/Users\//i);
  });
});

describe("toURLSearchParams", () => {
  it("flattens a Next.js searchParams record, taking the first of repeated keys", () => {
    const params = toURLSearchParams({
      keyword: "concert",
      city: ["lagos", "abuja"],
      category: undefined,
      empty: "",
    });
    expect(params.get("keyword")).toBe("concert");
    expect(params.get("city")).toBe("lagos");
    expect(params.has("category")).toBe(false);
    expect(params.has("empty")).toBe(false);
  });

  it("round-trips through the same parser the API route uses", () => {
    const record = toURLSearchParams({
      keyword: "jazz",
      city: "lagos",
      category: "music",
      page: "2",
      size: "10",
    });
    expect(parseEventQuery(record)).toEqual({
      keyword: "jazz",
      city: "lagos",
      category: "music",
      startDate: null,
      endDate: null,
      page: 2,
      size: 10,
    });
  });
});
