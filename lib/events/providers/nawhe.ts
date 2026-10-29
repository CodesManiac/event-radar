/**
 * nawhe provider adapter.
 *
 * Verified contract (2026-10): `GET https://nawhe.com/api/v1/events`
 * - Keyless, documented at https://nawhe.com/developers/events-api with an
 *   OpenAPI spec at /api/v1/openapi.json.
 * - Params used: `country` (ISO-2), `q` (max 120 chars), `page`, `per_page`
 *   (max 50). Rate limit: 120 requests/60s; Cache-Control: max-age=60.
 * - `category` cannot take comma lists (they are sanitised into one slug) and
 *   out-of-range pages are clamped rather than emptying — so this adapter
 *   materialises the Nigerian set (a handful of pages at most) and applies
 *   city, category and date filters locally, with locally counted totals.
 * - nawhe is UK + diaspora focused; Nigerian inventory is small but real.
 *
 * Event contract fields used: `id`, `title`, `summary`, `category`, `status`,
 * `start`, `end`, `timezone`, `image.url`, `url`, `location.{type,name,city,
 * country}`, `admission.price.{mode,currency,min_minor,max_minor}`.
 */

import { dayOf, isParseableIso, todayInAppZone } from "../datetime";
import { fetchJson, ProviderResponseError } from "../http";
import { asAbsoluteUrl, asFiniteNumber, asId, asRecord, asString } from "../normalize";
import type { EventProvider, ProviderQuery, ProviderResult } from "../provider";
import { canonicalCategory, nawheCityMatches, providerCategories, findCity } from "../taxonomy";
import type { EventItem } from "../types";

const SOURCE = "nawhe";
const BASE_URL = "https://nawhe.com/api/v1";
const CACHE_SECONDS = 60;
/** Documented `per_page` maximum. */
const PER_PAGE = 50;
/** Hard bound: at most 150 Nigerian events are materialised per query. */
const MAX_PAGES = 3;

interface NawhePagination {
  page?: unknown;
  has_next?: unknown;
}

interface NawheResponse {
  data?: unknown;
  meta?: { pagination?: NawhePagination };
}

/** Minor units → major units (NGN kobo, GBP pence, …). */
function toMajorUnits(minor: number | null): number | null {
  return minor === null ? null : minor / 100;
}

function normalizeEvent(raw: unknown): EventItem | null {
  const record = asRecord(raw);
  if (!record) return null;

  const id = asId(record.id);
  const title = asString(record.title);
  const url = asAbsoluteUrl(record.url);
  const start = asString(record.start);
  if (!id || !title || !url || !start || !isParseableIso(start)) return null;

  // Cancelled listings are not upcoming events; anything else is kept.
  const status = asString(record.status)?.toLowerCase();
  if (status === "cancelled" || status === "canceled") return null;

  const end = asString(record.end);
  const location = asRecord(record.location);
  const locationType = asString(location?.type)?.toLowerCase();
  const image = asRecord(record.image);
  const admission = asRecord(record.admission);
  const price = asRecord(admission?.price);
  const priceMode = asString(price?.mode)?.toLowerCase();

  const priceMin = toMajorUnits(asFiniteNumber(price?.min_minor));
  const priceMax = toMajorUnits(asFiniteNumber(price?.max_minor));
  const currency = asString(price?.currency);

  return {
    id: `${SOURCE}:${id}`,
    source: SOURCE,
    title,
    // `summary` is the only description the list endpoint exposes; the longer
    // description requires a per-event call, which would waste rate limit.
    description: asString(record.summary),
    imageUrl: asAbsoluteUrl(image?.url),
    startDate: start,
    endDate: end && isParseableIso(end) ? end : null,
    timezone: asString(record.timezone),
    venue: locationType === "physical" ? asString(location?.name) : null,
    city: asString(location?.city),
    country: asString(location?.country) ?? "NG",
    // Explicit mapping only: nawhe marks physical events; anything else that
    // is not explicitly "online" stays unknown (PRD §6).
    isOnline: locationType === "online" ? true : locationType === "physical" ? false : null,
    category: canonicalCategory(SOURCE, asString(record.category)),
    sourceCategory: asString(record.category),
    url,
    priceMin,
    priceMax,
    currency,
    isFree: price ? (priceMode === "free" ? true : priceMode ? false : null) : null,
  };
}

/** Applies the filters nawhe cannot express upstream. */
function matchesLocally(event: EventItem, query: ProviderQuery): boolean {
  const city = query.cityId ? findCity(query.cityId) : null;
  if (city && !nawheCityMatches(city, event.city)) return false;

  if (query.category) {
    const allowed = providerCategories(SOURCE, query.category);
    if (allowed.length === 0) return false;
    const raw = event.sourceCategory?.toLowerCase() ?? "";
    if (!allowed.includes(raw)) return false;
  }

  const day = dayOf(event.startDate);
  const lowerBound = query.startDate ?? todayInAppZone();
  if (day < lowerBound) return false;
  if (query.endDate && day > query.endDate) return false;

  return true;
}

export const nawheProvider: EventProvider = {
  source: SOURCE,
  isAvailable: true,

  async fetchEvents(query: ProviderQuery): Promise<ProviderResult> {
    // A canonical category this provider cannot filter on must not silently
    // return unfiltered results (and must not waste rate limit fetching).
    if (query.category && providerCategories(SOURCE, query.category).length === 0) {
      return { events: [], total: 0 };
    }

    const matched: EventItem[] = [];
    let page = 1;

    while (page <= MAX_PAGES) {
      const params = new URLSearchParams({
        country: "NG",
        page: String(page),
        per_page: String(PER_PAGE),
      });
      if (query.keyword) params.set("q", query.keyword);

      const payload = await fetchJson<NawheResponse>(SOURCE, `${BASE_URL}/events?${params.toString()}`, {
        revalidateSeconds: CACHE_SECONDS,
      });

      if (!payload || !Array.isArray(payload.data)) {
        throw new ProviderResponseError(SOURCE, "expected a data array");
      }

      for (const raw of payload.data) {
        const event = normalizeEvent(raw);
        if (event && matchesLocally(event, query)) matched.push(event);
      }

      const hasNext = payload.meta?.pagination?.has_next === true;
      if (!hasNext || payload.data.length === 0) break;
      page += 1;
    }

    // Totals are counted locally because the local filters narrow the set the
    // upstream pagination metadata knows nothing about.
    return { events: matched.slice(0, query.need), total: matched.length };
  },
};
