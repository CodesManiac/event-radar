/**
 * `GET /api/events` — internal events endpoint.
 *
 * Validates input, aggregates the configured providers, and returns a stable
 * response shape (PRD §6). Provider credentials, stack traces, and raw
 * upstream payloads never leave this boundary.
 *
 * Response: `{ events, total, page, size, hasMore, sources }`.
 */

import { parseEventQuery } from "@/lib/events/query";
import { getEvents } from "@/lib/events/service";
import { EventsError } from "@/lib/events/types";

// Note: no `runtime` segment export — `cacheComponents: true` in
// next.config.ts forbids route segment runtime config, and the default
// Node.js runtime is what this route needs (no Edge-only APIs are used).

const STATUS_BY_CODE: Record<EventsError["code"], number> = {
  invalid_query: 400,
  provider_unavailable: 502,
  rate_limited: 503,
};

export async function GET(request: Request): Promise<Response> {
  try {
    const query = parseEventQuery(new URL(request.url).searchParams);
    const page = await getEvents(query);

    return Response.json(page, {
      // Matches the providers' documented freshness windows.
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    // Next.js control-flow errors (e.g. the prerender bail-out that marks this
    // route dynamic under `cacheComponents`) carry a digest and must propagate.
    if (typeof error === "object" && error !== null && "digest" in error) throw error;

    if (error instanceof EventsError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: STATUS_BY_CODE[error.code] },
      );
    }

    console.error("[events] unhandled error", error);
    return Response.json(
      { error: { code: "internal_error", message: "Something went wrong while loading events." } },
      { status: 500 },
    );
  }
}
