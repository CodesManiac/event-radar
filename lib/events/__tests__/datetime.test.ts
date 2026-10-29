import { describe, expect, it } from "vitest";
import {
  addDays,
  dayOf,
  epochMs,
  isParseableIso,
  isValidIsoDay,
  timeZoneOffsetMinutes,
  todayInAppZone,
  withZoneOffset,
} from "../datetime";

describe("timeZoneOffsetMinutes", () => {
  it("returns +60 for Africa/Lagos (WAT, no daylight saving)", () => {
    const date = new Date("2026-10-22T10:00:00Z");
    expect(timeZoneOffsetMinutes("Africa/Lagos", date)).toBe(60);
  });

  it("returns 0 for UTC", () => {
    expect(timeZoneOffsetMinutes("UTC", new Date("2026-01-01T00:00:00Z"))).toBe(0);
  });
});

describe("withZoneOffset", () => {
  it("attaches the zone offset to naive timestamps", () => {
    expect(withZoneOffset("2026-10-22T11:00:00", "Africa/Lagos")).toBe("2026-10-22T11:00:00+01:00");
  });

  it("leaves offset-qualified timestamps untouched", () => {
    expect(withZoneOffset("2026-11-20T18:00:00+01:00", "Africa/Lagos")).toBe(
      "2026-11-20T18:00:00+01:00",
    );
  });

  it("keeps naive timestamps when no zone is known", () => {
    expect(withZoneOffset("2026-10-22T11:00:00", null)).toBe("2026-10-22T11:00:00");
  });

  it("rejects values that are not timestamps", () => {
    expect(withZoneOffset("TBD", "Africa/Lagos")).toBeNull();
    expect(withZoneOffset("2026-10-22", "Africa/Lagos")).toBeNull();
  });
});

describe("todayInAppZone", () => {
  it("uses the Nigerian calendar day, not the server day", () => {
    // 23:30 UTC is already past midnight in Lagos (UTC+1).
    expect(todayInAppZone(new Date("2026-10-20T23:30:00Z"))).toBe("2026-10-21");
    expect(todayInAppZone(new Date("2026-10-20T10:00:00Z"))).toBe("2026-10-20");
  });
});

describe("addDays / isValidIsoDay / dayOf", () => {
  it("rolls over months and years", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("validates real calendar days only", () => {
    expect(isValidIsoDay("2026-02-28")).toBe(true);
    expect(isValidIsoDay("2026-02-30")).toBe(false);
    expect(isValidIsoDay("2026-1-1")).toBe(false);
    expect(isValidIsoDay("22-10-2026")).toBe(false);
  });

  it("extracts the date part", () => {
    expect(dayOf("2026-10-22T11:00:00+01:00")).toBe("2026-10-22");
  });
});

describe("isParseableIso / epochMs", () => {
  it("accepts offset-qualified and naive timestamps", () => {
    expect(isParseableIso("2026-10-22T11:00:00+01:00")).toBe(true);
    expect(isParseableIso("2026-10-22T11:00:00")).toBe(true);
    expect(isParseableIso("2026-10-22")).toBe(false);
    expect(isParseableIso("soon")).toBe(false);
  });

  it("treats naive timestamps as UTC so sorting never uses the server zone", () => {
    expect(epochMs("2026-01-01T00:00:00")).toBe(Date.UTC(2026, 0, 1));
  });

  it("sorts unparseable values last", () => {
    expect(epochMs("not-a-date")).toBeGreaterThan(Date.UTC(2100, 0, 1));
  });
});
