/**
 * Bushdrum provider adapter.
 *
 * Verified contract (2026-10): `GET https://bushdrum.com/api/events`
 * - Keyless, documented at https://bushdrum.com/developers
 * - Params used: `city` (slug), `q`, `category` (comma-separated acts as OR),
 *   `date_from`/`date_to` (`YYYY-MM-DD`, inclusive), `is_free`, `page`,
 *   `per_page` (max 100; 422 above), `sort` (`date_asc`).
 * - Unknown params such as `country` are silently ignored — Nigeria must be
 *   scoped through the city slugs below, otherwise results span every city.
 * - Meta shape: `{ events: [...], total, page, per_page, pages }`.
 *
 * Fair use requires crediting Bushdrum and linking back to bushdrum.com
 * (handled in the site footer).
 */

import { APP_TIME_ZONE, isParseableIso, todayInAppZone, withZoneOffset } from "../datetime";
import { fetchJson, ProviderResponseError } from "../http";
import { asAbsoluteUrl, asBoolean, asFiniteNumber, asId, asRecord, asString } from "../normalize";
import type { EventProvider, ProviderQuery, ProviderResult } from "../provider";
import { canonicalCategory, findCity, NIGERIAN_CITIES, providerCategories } from "../taxonomy";
import type { EventItem } from "../types";

const SOURCE = "bushdrum";
const BASE_URL = "https://bushdrum.com/api";
/** Bushdrum honours its documented cache window of 60s; keep ours conservative. */
const CACHE_SECONDS = 120;
const PER_PAGE_MAX = 100;
const MAX_CHUNKS = 5;

/** Public Bushdrum city slugs in Nigeria, from `GET /api/cities` (country_code NG). */
const NIGERIAN_CITY_SLUGS: string[] = NIGERIAN_CITIES.map((city) => city.bushdrum).filter(
  (slug): slug is string => typeof slug === "string" && slug.length > 0,
);

interface BushdrumResponse {
  events?: unknown;
  total?: unknown;
}

function normalizeEvent(raw: unknown, citySlug: string): EventItem | null {
  const record = asRecord(raw);
  if (!record) return null;

  const id = asId(record.id);
  const title = asString(record.title);
  const url = asAbsoluteUrl(record.url);
  const rawStart = asString(record.start_time);
  if (!id || !title || !url || !rawStart) return null;

  const startDate = withZoneOffset(rawStart, APP_TIME_ZONE);
  if (!startDate || !isParseableIso(startDate)) return null;

  const rawEnd = asString(record.end_time);
  const endDate = rawEnd ? withZoneOffset(rawEnd, APP_TIME_ZONE) : null;

  const venue = asRecord(record.venue);
  const cityLabel = findCityByBushdrumSlug(citySlug) ?? asString(venue?.city);

  const priceMin = asFiniteNumber(record.price_min);
  const priceMax = asFiniteNumber(record.price_max);

  return {
    id: `${SOURCE}:${id}`,
    source: SOURCE,
    title,
    description: asString(record.summary),
    imageUrl: asAbsoluteUrl(record.image_url),
    startDate,
    endDate: endDate && isParseableIso(endDate) ? endDate : null,
    timezone: APP_TIME_ZONE,
    venue: asString(venue?.name),
    city: cityLabel,
    // Bushdrum exposes venue presence and `indoor_outdoor`, but no explicit
    // online flag — so online-ness stays unknown rather than guessed (PRD §6).
    isOnline: null,
    country: "NG",
    category: canonicalCategory(SOURCE, asString(record.category)),
    sourceCategory: asString(record.category),
    url,
    priceMin,
    priceMax,
    currency: asString(record.currency),
    isFree: asBoolean(record.is_free),
  };
}

function findCityByBushdrumSlug(slug: string): string | null {
  return NIGERIAN_CITIES.find((city) => city.bushdrum === slug)?.label ?? null;
}

export const bushdrumProvider: EventProvider = {
  source: SOURCE,
  isAvailable: true,

  async fetchEvents(query: ProviderQuery): Promise<ProviderResult> {
    const categories = query.category ? providerCategories(SOURCE, query.category) : null;
    // A canonical category this provider cannot filter on must not silently
    // return unfiltered results.
    if (query.category && categories!.length === 0) {
      return { events: [], total: 0 };
    }

    const citySlug = query.cityId ? findCity(query.cityId)?.bushdrum : NIGERIAN_CITY_SLUGS[0];
    if (!citySlug) {
      // The provider has no such city; an empty result is the honest answer.
      return { events: [], total: 0 };
    }

    const events: EventItem[] = [];
    let total = 0;
    let fetched = 0;
    let page = 1;

    while (fetched < query.need && page <= MAX_CHUNKS) {      const params = new URLSearchParams({
        city: citySlug,
        page: String(page),
        per_page: String(Math.min(PER_PAGE_MAX, query.need - fetched)),
        sort: "date_asc",
      });

      if (query.keyword) params.set("q", query.keyword);
      if (categories?.length) params.set("category", categories.join(","));
      params.set("date_from", query.startDate ?? todayInAppZone());
      if (query.endDate) params.set("date_to", query.endDate);

      const payload = await fetchJson<BushdrumResponse>(
        SOURCE,
        `${BASE_URL}/events?${params.toString()}`,
        { revalidateSeconds: CACHE_SECONDS },
      );

      if (!payload || !Array.isArray(payload.events) || typeof payload.total !== "number") {
        throw new ProviderResponseError(SOURCE, "expected an events array and a numeric total");
      }

      for (const raw of payload.events) {
        const event = normalizeEvent(raw, citySlug);
        if (event) events.push(event);
      }

      total = payload.total;
      fetched += payload.events.length;
      page += 1;

      // Stop once the provider reports no further results for this city.
      if (payload.events.length === 0 || fetched >= total) break;
    }

    return { events, total };
  },
};
