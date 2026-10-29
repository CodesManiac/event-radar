import { describe, expect, it } from "vitest";
import { asAbsoluteUrl, asId } from "../normalize";

describe("asAbsoluteUrl", () => {
  it("accepts absolute http(s) URLs", () => {
    expect(asAbsoluteUrl("https://bushdrum.com/e/42")).toBe("https://bushdrum.com/e/42");
    expect(asAbsoluteUrl("  http://example.com/x  ")).toBe("http://example.com/x");
  });

  it("degrades relative fragments, non-http schemes, and junk to null", () => {
    expect(asAbsoluteUrl("COA")).toBeNull();
    expect(asAbsoluteUrl("/events/4")).toBeNull();
    expect(asAbsoluteUrl("javascript:alert(1)")).toBeNull();
    expect(asAbsoluteUrl("data:text/html,x")).toBeNull();
    expect(asAbsoluteUrl("")).toBeNull();
    expect(asAbsoluteUrl(null)).toBeNull();
    expect(asAbsoluteUrl(42)).toBeNull();
  });
});

describe("asId", () => {
  it("accepts numeric and string ids, rejecting empties", () => {
    expect(asId(42)).toBe("42");
    expect(asId("42")).toBe("42");
    expect(asId(" evt-1 ")).toBe("evt-1");
    expect(asId("")).toBeNull();
    expect(asId(Number.NaN)).toBeNull();
    expect(asId({})).toBeNull();
  });
});
