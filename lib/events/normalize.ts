/**
 * Defensive readers for untyped upstream payloads.
 *
 * Provider responses are validated at the edges: anything missing or of an
 * unexpected type degrades to null (or causes the record to be skipped when
 * the field is required to display the event at all).
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads a value as a plain object, or null when it is anything else. */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

/**
 * Reads an upstream event id. Both verified providers return numeric ids
 * (bushdrum `id: 42`, nawhe `id: 82`), but string ids are also plausible, so
 * either is accepted and normalized to a non-empty string.
 */
export function asId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return asString(value);
}

export function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Strict boolean read: only real booleans count, never truthy strings. */
export function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/**
 * Reads an upstream value as an absolute http(s) URL.
 *
 * Providers occasionally emit relative fragments (observed in a live bushdrum
 * payload: `image_url: "COA"`). Left alone, such a value would resolve against
 * *our* origin and 404 — so it degrades to null instead of ever reaching a
 * `src`/`href`.
 */
export function asAbsoluteUrl(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}
