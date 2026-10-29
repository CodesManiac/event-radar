import Link from "next/link";
import type { ReactNode } from "react";
import { eventsHref } from "@/lib/events/href";
import { FILTERABLE_CATEGORIES, NIGERIAN_CITIES } from "@/lib/events/taxonomy";
import type { EventQuery } from "@/lib/events/types";
import { SearchForm } from "./search-form";

function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "rounded-full border border-purple bg-purple/25 px-3 py-1.5 text-sm font-medium text-ice"
          : "rounded-full border border-navy-700 bg-navy-800 px-3 py-1.5 text-sm text-ice/70 transition hover:border-indigo/70 hover:text-ice"
      }
    >
      {children}
    </Link>
  );
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-ice/50">{label}</h3>
      <ul className="flex flex-wrap gap-2">{children}</ul>
    </div>
  );
}

/**
 * Search box + city/category filter chips (PRD §7). Every control is a link or
 * a plain GET form, so the whole feed — including filters — works without
 * JavaScript and every state is a shareable URL.
 */
export function EventFilters({ query }: { query: EventQuery }) {
  const hasFilters = Boolean(
    query.keyword || query.city || query.category || query.startDate || query.endDate,
  );

  // Chips replace exactly one dimension and reset paging; everything else is
  // carried over so filters compose.
  const cityBase = {
    keyword: query.keyword ?? undefined,
    category: query.category ?? undefined,
    startDate: query.startDate ?? undefined,
    endDate: query.endDate ?? undefined,
  };
  const categoryBase = {
    keyword: query.keyword ?? undefined,
    city: query.city ?? undefined,
    startDate: query.startDate ?? undefined,
    endDate: query.endDate ?? undefined,
  };

  return (
    <section aria-label="Search and filters" className="space-y-6">
      {/* Remounts when the applied keyword changes so the input reflects it. */}
      <SearchForm key={query.keyword ?? ""} query={query} />

      <ChipGroup label="City">
        <li>
          <Chip href={eventsHref({ ...cityBase, city: undefined })} active={!query.city}>
            All Nigeria
          </Chip>
        </li>
        {NIGERIAN_CITIES.map((city) => (
          <li key={city.id}>
            <Chip href={eventsHref({ ...cityBase, city: city.id })} active={query.city === city.id}>
              {city.label}
            </Chip>
          </li>
        ))}
      </ChipGroup>

      <ChipGroup label="Category">
        <li>
          <Chip href={eventsHref({ ...categoryBase, category: undefined })} active={!query.category}>
            All events
          </Chip>
        </li>
        {FILTERABLE_CATEGORIES.map((option) => (
          <li key={option.value}>
            <Chip
              href={eventsHref({ ...categoryBase, category: option.value })}
              active={query.category === option.value}
            >
              {option.label}
            </Chip>
          </li>
        ))}
      </ChipGroup>

      {hasFilters && (
        <p>
          <Link
            href="/"
            className="text-sm text-indigo-300 underline decoration-indigo-300/40 underline-offset-2 hover:decoration-indigo-300"
          >
            Clear all filters
          </Link>
        </p>
      )}
    </section>
  );
}
