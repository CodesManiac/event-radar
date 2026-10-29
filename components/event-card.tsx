import Image from "next/image";
import { canOptimizeImage } from "@/lib/image-hosts";
import { formatEventDate, formatEventDateTime, formatPriceRange } from "@/lib/format";
import { categoryLabel, sourceLabel } from "@/lib/events/taxonomy";
import type { EventItem } from "@/lib/events/types";
import { RadarMark } from "./radar-mark";

/**
 * Price pill text: the provider's own statement, never an estimate.
 * Order of truth: explicit free flag → known price range → explicit paid flag.
 */
function priceLabel(event: EventItem): string | null {
  if (event.isFree === true) return "Free";
  const range = formatPriceRange(event.priceMin, event.priceMax, event.currency);
  if (range) return range;
  if (event.isFree === false) return "Paid";
  return null;
}

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5 shrink-0">
      <path
        d="M8 14.5s4.5-4.2 4.5-7.7A4.5 4.5 0 0 0 3.5 6.8c0 3.5 4.5 7.7 4.5 7.7Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6.7" r="1.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/**
 * Card artwork: optimized for allowlisted CDN hosts, plain lazy <img> for
 * everything else (arbitrary organizer sites). The browser loads those
 * directly — never the server — so a hostile or dead URL can neither crash
 * the page nor turn the app into an open proxy. A failed image degrades to
 * the card's navy background.
 */
function EventImage({ url }: { url: string }) {
  if (canOptimizeImage(url)) {
    return (
      <Image
        src={url}
        alt=""
        fill
        sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition duration-300 group-hover:scale-[1.03]"
      />
    );
  }
  // The browser fetches unlisted hosts directly; see lib/image-hosts.ts.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- deliberate fallback for arbitrary provider image hosts
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
    />
  );
}

/** One normalized event as a card. Null fields simply render nothing extra. */
export function EventCard({ event }: { event: EventItem }) {
  const price = priceLabel(event);
  const location = [event.venue, event.city].filter(Boolean).join(" · ");

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-navy-700 bg-navy-800 transition duration-200 hover:border-purple/60 hover:shadow-[0_16px_38px_-18px_rgba(142,5,194,0.55)]">
      <div className="relative h-44 w-full overflow-hidden bg-navy-700">
        {event.imageUrl ? (
          <EventImage url={event.imageUrl} />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#101e44,#0a1433_55%,#2a0f47)]"
          >
            <RadarMark className="h-12 w-12 text-indigo/50" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full border border-ice/15 bg-navy/85 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-ice/85 backdrop-blur">
          {categoryLabel(event.category)}
        </span>
        {event.isOnline === true && (
          <span className="absolute right-3 top-3 rounded-full border border-indigo/60 bg-indigo/25 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-ice backdrop-blur">
            Online
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-300">
          <time dateTime={event.startDate}>{formatEventDateTime(event.startDate, event.timezone)}</time>
          {event.endDate && (
            <>
              <span aria-hidden="true"> → </span>
              <span className="text-indigo-300/70">ends {formatEventDate(event.endDate, event.timezone)}</span>
            </>
          )}
        </p>

        <h3 className="text-base font-semibold leading-snug">
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ice transition hover:text-indigo-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            {event.title}
            <span className="sr-only"> — open the event page at {sourceLabel(event.source)} in a new tab</span>
          </a>
        </h3>

        {event.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-ice/60">{event.description}</p>
        )}

        {location && (
          <p className="flex items-center gap-1.5 text-sm text-ice/75">
            <PinIcon />
            <span className="truncate">{location}</span>
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-navy-700/70 pt-3">
          {price ? (
            <span className="rounded-full border border-purple/45 bg-purple/15 px-2.5 py-1 text-xs font-semibold text-ice">
              {price}
            </span>
          ) : null}
          <span className="ml-auto text-[11px] uppercase tracking-wider text-ice/40">
            via {sourceLabel(event.source)}
          </span>
        </div>
      </div>
    </article>
  );
}
