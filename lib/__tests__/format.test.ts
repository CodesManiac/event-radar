import { describe, expect, it } from "vitest";
import { FALLBACK_TIME_ZONE, formatEventDate, formatEventDateTime, formatPriceRange } from "../format";

describe("formatEventDateTime", () => {
  it("renders in WAT when the event carries its time zone", () => {
    expect(formatEventDateTime("2026-11-03T10:00:00+01:00", "Africa/Lagos")).toBe(
      "Tue, 3 Nov 2026, 10:00",
    );
  });

  it("defaults to Africa/Lagos when the provider exposes no time zone", () => {
    expect(FALLBACK_TIME_ZONE).toBe("Africa/Lagos");
    expect(formatEventDateTime("2026-12-10T18:00:00+01:00", null)).toBe("Thu, 10 Dec 2026, 18:00");
  });

  it("survives an invalid time zone instead of crashing the card", () => {
    expect(() => formatEventDateTime("2026-11-03T10:00:00+01:00", "Not/AZone")).not.toThrow();
  });
});

describe("formatEventDate", () => {
  it("renders a date-only string in the event's zone", () => {
    expect(formatEventDate("2026-11-06T23:30:00+01:00", "Africa/Lagos")).toBe("Fri, 6 Nov 2026");
  });
});

describe("formatPriceRange", () => {
  it("formats a single known price in naira without kobo noise", () => {
    expect(formatPriceRange(20000, null, "NGN")).toBe("₦20,000");
  });

  it("formats a range when max exceeds min", () => {
    expect(formatPriceRange(1000, 5000, "NGN")).toBe("₦1,000 – ₦5,000");
  });

  it("ignores a max that does not exceed min", () => {
    expect(formatPriceRange(1000, 1000, "NGN")).toBe("₦1,000");
  });

  it("keeps kobo when the price actually has fractional units", () => {
    expect(formatPriceRange(1500.5, null, "NGN")).toBe("₦1,500.5");
  });

  it("falls back to the currency code for malformed codes", () => {
    expect(formatPriceRange(1000, null, "ABCD")).toBe("ABCD 1000");
  });

  it("returns null when no price is known", () => {
    expect(formatPriceRange(null, 500, "NGN")).toBeNull();
    expect(formatPriceRange(null, null, null)).toBeNull();
  });
});
