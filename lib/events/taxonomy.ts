/**
 * Cross-provider vocabulary mapping.
 *
 * Every provider speaks its own category and city language. This module is the
 * single place where those vocabularies are translated into the canonical
 * taxonomy (PRD §5.4: "Categories must be mapped consistently across sources").
 *
 * All mappings were derived from the live provider responses documented in the
 * README. Categories that no provider can filter on are deliberately excluded
 * from the filter list rather than shipped as dead controls (PRD §5.4).
 */

import { EVENT_CATEGORIES, type EventCategory } from "./types";

export type ProviderKey = "bushdrum" | "nawhe";

export interface CategoryOption {
  value: EventCategory;
  label: string;
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  music: "Music",
  sports: "Sports",
  "arts-entertainment": "Arts & Entertainment",
  business: "Business",
  education: "Education",
  technology: "Technology",
  workshops: "Workshops",
  community: "Community",
  other: "Other",
};

/** Provider category slug → canonical category. */
const PROVIDER_CATEGORY_TO_CANONICAL: Record<ProviderKey, Record<string, EventCategory>> = {
  bushdrum: {
    music: "music",
    sports: "sports",
    nightlife: "arts-entertainment",
    film: "arts-entertainment",
    theater: "arts-entertainment",
    comedy: "arts-entertainment",
    art: "arts-entertainment",
    festival: "arts-entertainment",
    conference: "business",
    lecture: "education",
    literature: "education",
    tech: "technology",
    workshop: "workshops",
    community: "community",
    family: "community",
    food: "community",
    wellness: "community",
    market: "community",
  },
  nawhe: {
    "concerts-music": "music",
    "sports-fitness": "sports",
    "parties-nightlife": "arts-entertainment",
    comedy: "arts-entertainment",
    "theatre-performing-arts": "arts-entertainment",
    "film-cinema": "arts-entertainment",
    "arts-exhibitions": "arts-entertainment",
    "culture-festivals": "arts-entertainment",
    "awards-ceremonies": "arts-entertainment",
    "owambe-celebrations": "arts-entertainment",
    "business-networking": "business",
    "education-workshops": "education",
    "family-kids": "community",
    "food-drink": "community",
    "faith-spirituality": "community",
    "health-wellness": "community",
    "community-charity": "community",
    other: "other",
  },
};

/**
 * Canonical category → provider category slugs used when filtering.
 * An empty list means the provider cannot filter on that canonical category,
 * so it is skipped for that query instead of returning wrong results.
 */
const CANONICAL_CATEGORY_TO_PROVIDERS: Record<
  ProviderKey,
  Partial<Record<EventCategory, string[]>>
> = {
  bushdrum: {
    music: ["music"],
    sports: ["sports"],
    "arts-entertainment": ["nightlife", "film", "theater", "comedy", "art", "festival"],
    business: ["conference"],
    education: ["lecture", "literature"],
    technology: ["tech"],
    workshops: ["workshop"],
    community: ["community", "family", "food", "wellness", "market"],
    other: [],
  },
  nawhe: {
    music: ["concerts-music"],
    sports: ["sports-fitness"],
    "arts-entertainment": [
      "parties-nightlife",
      "comedy",
      "theatre-performing-arts",
      "film-cinema",
      "arts-exhibitions",
      "culture-festivals",
      "awards-ceremonies",
      "owambe-celebrations",
    ],
    business: ["business-networking"],
    education: ["education-workshops"],
    community: [
      "family-kids",
      "food-drink",
      "faith-spirituality",
      "health-wellness",
      "community-charity",
    ],
    other: ["other"],
  },
};

/**
 * Canonical categories the UI can filter on: shown only when at least one
 * provider supports filtering, and excluding "other", which cannot be
 * expressed as an upstream filter for every source.
 */
export const FILTERABLE_CATEGORIES: CategoryOption[] = EVENT_CATEGORIES.filter(
  (category) =>
    category !== "other" &&
    Object.values(CANONICAL_CATEGORY_TO_PROVIDERS).some((map) => (map[category]?.length ?? 0) > 0),
).map((category) => ({ value: category, label: CATEGORY_LABELS[category] }));

/** Category label for display, including the non-filterable "other". */
export function categoryLabel(category: EventCategory): string {
  return CATEGORY_LABELS[category];
}

export function isFilterableCategory(value: string): value is EventCategory {
  return FILTERABLE_CATEGORIES.some((option) => option.value === value);
}

/** Maps a raw provider category to the canonical taxonomy ("other" as fallback). */
export function canonicalCategory(provider: ProviderKey, raw: string | null | undefined): EventCategory {
  if (!raw) return "other";
  return PROVIDER_CATEGORY_TO_CANONICAL[provider][raw.toLowerCase()] ?? "other";
}

/** Provider slugs backing a canonical category; empty when unsupported. */
export function providerCategories(provider: ProviderKey, category: EventCategory): string[] {
  return CANONICAL_CATEGORY_TO_PROVIDERS[provider][category] ?? [];
}

/** A Nigerian city that at least one configured provider can filter on. */
export interface NigerianCity {
  id: string;
  label: string;
  /** Bushdrum city slug (bushdrum filters by its own city directory). */
  bushdrum?: string;
  /**
   * nawhe city values belonging to this city. nawhe stores Lagos districts
   * (Ikeja, Lekki Phase 1, Lagos Island) as distinct "cities", so they are
   * grouped here; the event card still shows nawhe's own city value.
   */
  nawhe: string[];
}

export const NIGERIAN_CITIES: NigerianCity[] = [
  {
    id: "lagos",
    label: "Lagos",
    bushdrum: "lagos",
    nawhe: ["lagos", "lagos island", "ikeja", "lekki phase 1"],
  },
  {
    id: "port-harcourt",
    label: "Port Harcourt",
    nawhe: ["port harcourt"],
  },
];

export function findCity(id: string | null | undefined): NigerianCity | null {
  if (!id) return null;
  return NIGERIAN_CITIES.find((city) => city.id === id) ?? null;
}

/** Human-readable provider names for provenance and status copy. */
const SOURCE_LABELS: Record<ProviderKey, string> = {
  bushdrum: "Bushdrum",
  nawhe: "nawhe",
};

/** Display name for a source key; falls back to the raw key for safety. */
export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source as ProviderKey] ?? source;
}

/** True when a nawhe city value belongs to a canonical city. */
export function nawheCityMatches(city: NigerianCity, rawCity: string | null | undefined): boolean {
  if (!rawCity) return false;
  return city.nawhe.includes(rawCity.trim().toLowerCase());
}
