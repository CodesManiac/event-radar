/**
 * Small date/time helpers.
 *
 * Providers expose a mix of offset-qualified ISO strings (nawhe) and naive
 * local timestamps (bushdrum). Everything is normalized to offset-qualified
 * ISO strings so sorting and display never depend on the server's own zone.
 */

export const APP_TIME_ZONE = "Africa/Lagos";

/** Minutes offset of `timeZone` at `date` (handles zones with DST correctly). */
export function timeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );

  return Math.round((asUtc - date.getTime()) / 60_000);
}

function offsetSuffix(timeZone: string, date: Date): string {
  const minutes = timeZoneOffsetMinutes(timeZone, date);
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const mins = String(abs % 60).padStart(2, "0");
  return `${sign}${hours}:${mins}`;
}

const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Attaches the zone offset to a naive ISO timestamp such as
 * `2026-10-22T11:00:00`. Strings that already carry an offset pass through.
 * Returns null when the input is not a usable ISO timestamp.
 */
export function withZoneOffset(naiveIso: string, timeZone: string | null): string | null {
  const trimmed = naiveIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) return null;
  if (HAS_OFFSET.test(trimmed)) return trimmed;
  if (!timeZone) return trimmed;

  // Interpret the naive parts as UTC, look up the offset that applies in the
  // target zone at that instant, then attach it. A second pass settles the
  // rare DST-boundary case.
  const asUtc = new Date(`${trimmed}Z`);
  if (Number.isNaN(asUtc.getTime())) return null;
  let instant = new Date(asUtc.getTime() - timeZoneOffsetMinutes(timeZone, asUtc) * 60_000);
  instant = new Date(asUtc.getTime() - timeZoneOffsetMinutes(timeZone, instant) * 60_000);
  const suffix = offsetSuffix(timeZone, instant);
  return `${trimmed}${suffix}`;
}

/** `YYYY-MM-DD` for `date` as seen in `timeZone`. */
export function isoDayInZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // en-CA renders as YYYY-MM-DD
}

/** Today's date in Nigeria, as `YYYY-MM-DD`. */
export function todayInAppZone(now: Date = new Date()): string {
  return isoDayInZone(now, APP_TIME_ZONE);
}

/** Adds whole days to a `YYYY-MM-DD` string. */
export function addDays(isoDay: string, days: number): string {
  const [year, month, day] = isoDay.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function isValidIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** True when `value` looks like an ISO timestamp we can display. */
export function isParseableIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return false;
  const normalized = HAS_OFFSET.test(value) ? value : `${value}Z`;
  return !Number.isNaN(Date.parse(normalized));
}

/**
 * Sort key for ISO timestamps. Naive strings are treated as UTC so ordering
 * never depends on the server zone; unparseable values sort last.
 */
export function epochMs(iso: string): number {
  const normalized = HAS_OFFSET.test(iso) ? iso : `${iso}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

/** First 10 characters of a timestamp, i.e. its calendar date part. */
export function dayOf(iso: string): string {
  return iso.slice(0, 10);
}
