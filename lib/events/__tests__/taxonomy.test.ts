import { describe, expect, it } from "vitest";
import {
  canonicalCategory,
  FILTERABLE_CATEGORIES,
  findCity,
  NIGERIAN_CITIES,
  nawheCityMatches,
  providerCategories,
} from "../taxonomy";
import { EVENT_CATEGORIES } from "../types";

/** Category slugs observed on the live provider APIs (October 2026). */
const LIVE_BUSHDRUM_SLUGS = [
  "conference",
  "nightlife",
  "music",
  "community",
  "tech",
  "wellness",
  "sports",
  "film",
  "workshop",
  "family",
  "festival",
  "market",
  "art",
  "food",
  "theater",
  "comedy",
  "literature",
  "lecture",
];

const LIVE_NAWHE_SLUGS = [
  "parties-nightlife",
  "concerts-music",
  "comedy",
  "owambe-celebrations",
  "culture-festivals",
  "awards-ceremonies",
  "theatre-performing-arts",
  "film-cinema",
  "arts-exhibitions",
  "family-kids",
  "food-drink",
  "business-networking",
  "faith-spirituality",
  "education-workshops",
  "sports-fitness",
  "health-wellness",
  "community-charity",
  "other",
];

describe("canonical category mapping", () => {
  it("maps every live bushdrum slug to a real category", () => {
    for (const slug of LIVE_BUSHDRUM_SLUGS) {
      expect(canonicalCategory("bushdrum", slug), slug).not.toBe("other");
    }
  });

  it("maps every live nawhe slug to a real category", () => {
    for (const slug of LIVE_NAWHE_SLUGS) {
      const mapped = canonicalCategory("nawhe", slug);
      // Every slug resolves; only nawhe's own catch-all maps to the canonical
      // catch-all, everything else lands in a concrete category.
      expect(EVENT_CATEGORIES, slug).toContain(mapped);
      if (slug !== "other") expect(mapped, slug).not.toBe("other");
    }
  });

  it('falls back to "other" for unknown or missing values', () => {
    expect(canonicalCategory("bushdrum", "unheard-of")).toBe("other");
    expect(canonicalCategory("nawhe", null)).toBe("other");
  });

  it("agrees with the reverse mapping (round trip)", () => {
    for (const provider of ["bushdrum", "nawhe"] as const) {
      for (const category of EVENT_CATEGORIES) {
        for (const slug of providerCategories(provider, category)) {
          expect(canonicalCategory(provider, slug), `${provider}:${slug}`).toBe(category);
        }
      }
    }
  });
});

describe("filterable categories", () => {
  it("offers the PRD categories that providers can actually filter on", () => {
    const values = FILTERABLE_CATEGORIES.map((option) => option.value);
    for (const expected of [
      "music",
      "sports",
      "arts-entertainment",
      "business",
      "education",
      "technology",
      "workshops",
      "community",
    ]) {
      expect(values).toContain(expected);
    }
  });

  it('excludes "other" because no provider can filter it consistently', () => {
    expect(FILTERABLE_CATEGORIES.map((option) => option.value)).not.toContain("other");
    expect(providerCategories("bushdrum", "other")).toEqual([]);
  });

  it("skips providers that cannot express a category", () => {
    // nawhe has no separate technology or workshop taxonomy.
    expect(providerCategories("nawhe", "technology")).toEqual([]);
    expect(providerCategories("nawhe", "workshops")).toEqual([]);
    expect(providerCategories("bushdrum", "technology")).toEqual(["tech"]);
  });
});

describe("Nigerian cities", () => {
  it("only offers cities a provider can filter on", () => {
    expect(NIGERIAN_CITIES.map((city) => city.id)).toEqual(["lagos", "port-harcourt"]);
    expect(findCity("lagos")?.bushdrum).toBe("lagos");
    // bushdrum has no Port Harcourt feed; nawhe does.
    expect(findCity("port-harcourt")?.bushdrum).toBeUndefined();
  });

  it("returns null for unknown cities", () => {
    expect(findCity("abuja")).toBeNull();
    expect(findCity(null)).toBeNull();
  });

  it("groups nawhe's Lagos-district city values under Lagos", () => {
    const lagos = findCity("lagos")!;
    expect(nawheCityMatches(lagos, "Lagos")).toBe(true);
    expect(nawheCityMatches(lagos, "ikeja")).toBe(true);
    expect(nawheCityMatches(lagos, "Lekki Phase 1")).toBe(true);
    expect(nawheCityMatches(lagos, "Lagos Island")).toBe(true);
    expect(nawheCityMatches(lagos, "Port Harcourt")).toBe(false);
    expect(nawheCityMatches(lagos, null)).toBe(false);
  });
});
