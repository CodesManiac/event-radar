/**
 * Presentation helpers for event data: dates and prices.
 *
 * Pure functions shared by server-rendered cards and any client UI. All
 * formatting is explicit (time zone, currency, locale) so output is stable in
 * tests and consistent for Nigerian users.
 */

/** Fallback zone when a provider does not expose one (PRD: WAT). */
export const FALLBACK_TIME_ZONE = "Africa/Lagos";

/**
 * Formats an ISO 8601 instant for display, e.g. "Tue, 3 Nov 2026, 10:00".
 * Unknown time zones degrade to the fallback, never to a thrown error.
 */
export function formatEventDateTime(iso: string, timeZone?: string | null): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };

  try {
    return new Intl.DateTimeFormat("en-NG", { ...options, timeZone: timeZone ?? FALLBACK_TIME_ZONE })
      .format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat("en-NG", options).format(date);
    } catch {
      return iso;
    }
  }
}

/** Date-only rendering (used for end dates), e.g. "Fri, 6 Nov 2026". */
export function formatEventDate(iso: string, timeZone?: string | null): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  try {
    return new Intl.DateTimeFormat("en-NG", { ...options, timeZone: timeZone ?? FALLBACK_TIME_ZONE })
      .format(date);
  } catch {
    return new Intl.DateTimeFormat("en-NG", options).format(date);
  }
}

function formatAmount(amount: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency ?? "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Malformed currency code: show the plain number with its code.
    return `${currency ?? "NGN"} ${amount}`;
  }
}

/**
 * Formats a price range from major units. Returns null when no price is
 * known, so callers can fall back to the provider's free/paid statement.
 */
export function formatPriceRange(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min === null) return null;
  if (max !== null && max > min) {
    return `${formatAmount(min, currency)} – ${formatAmount(max, currency)}`;
  }
  return formatAmount(min, currency);
}
