/**
 * Query parsing and validation for `GET /api/events` (PRD §6).
 *
 * Invalid input produces an `EventsError("invalid_query")`, which the route
 * maps to HTTP 400 with a safe message. Page size is bounded so a single
 * request cannot force providers to materialise unbounded result sets.
 */

import { isValidIsoDay } from "./datetime";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./service";
import { findCity, isFilterableCategory, NIGERIAN_CITIES } from "./taxonomy";
import { EventsError, type EventCategory, type EventQuery } from "./types";

const MAX_KEYWORD_LENGTH = 100;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

function invalid(message: string): never {
  throw new EventsError("invalid_query", message);
}

function readInt(value: string | null, name: string): number | null {
  if (value === null || value.trim() === "") return null;
  if (!/^\d+$/.test(value.trim())) invalid(`"${name}" must be a whole number.`);
  return Number(value.trim());
}

/**
 * Flattens a Next.js `searchParams` prop (`string | string[] | undefined`
 * values) into a `URLSearchParams` for {@link parseEventQuery}. Repeated keys
 * collapse to their first value, matching how browsers submit forms.
 */
export function toURLSearchParams(
  record: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    const flat = Array.isArray(value) ? value[0] : value;
    if (typeof flat === "string" && flat !== "") params.set(key, flat);
  }
  return params;
}

export function parseEventQuery(params: URLSearchParams): EventQuery {
  const keywordRaw = params.get("keyword");
  const keyword = keywordRaw?.trim() || null;
  if (keyword && keyword.length > MAX_KEYWORD_LENGTH) {
    invalid(`Search terms are limited to ${MAX_KEYWORD_LENGTH} characters.`);
  }

  const cityRaw = params.get("city")?.trim() || null;
  if (cityRaw && !findCity(cityRaw)) {
    invalid(
      `"${cityRaw}" is not a supported city. Supported: ${NIGERIAN_CITIES.map((c) => c.id).join(", ")}.`,
    );
  }

  const categoryRaw = params.get("category")?.trim() || null;
  if (categoryRaw && !isFilterableCategory(categoryRaw)) {
    invalid(`"${categoryRaw}" is not a filterable category.`);
  }

  const startDate = params.get("startDate")?.trim() || null;
  const endDate = params.get("endDate")?.trim() || null;
  for (const [name, value] of [
    ["startDate", startDate],
    ["endDate", endDate],
  ] as const) {
    if (!value) continue;
    if (!isValidIsoDay(value)) invalid(`"${name}" must use the YYYY-MM-DD format.`);
    const year = Number(value.slice(0, 4));
    if (year < MIN_YEAR || year > MAX_YEAR) invalid(`"${name}" is outside the supported range.`);
  }
  if (startDate && endDate && startDate > endDate) {
    invalid('"startDate" must be on or before "endDate".');
  }

  const page = readInt(params.get("page"), "page") ?? 1;
  if (page < 1) invalid('"page" must be 1 or greater.');

  const size = readInt(params.get("size"), "size") ?? DEFAULT_PAGE_SIZE;
  if (size < 1 || size > MAX_PAGE_SIZE) {
    invalid(`"size" must be between 1 and ${MAX_PAGE_SIZE}.`);
  }

  return {
    keyword,
    city: cityRaw,
    category: (categoryRaw ?? null) as EventCategory | null,
    startDate,
    endDate,
    page,
    size,
  };
}
