"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { eventsHref } from "@/lib/events/href";
import type { EventQuery } from "@/lib/events/types";

/**
 * Keyword search for the feed.
 *
 * Renders as a plain GET form (works with JavaScript disabled — active filters
 * are preserved through hidden inputs); with JavaScript it navigates
 * client-side so the feed's Suspense boundary streams a fresh skeleton instead
 * of reloading the page.
 */
export function SearchForm({ query }: { query: EventQuery }) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const keyword = String(data.get("keyword") ?? "").trim();
    router.push(
      eventsHref({
        keyword: keyword || undefined,
        city: query.city ?? undefined,
        category: query.category ?? undefined,
        startDate: query.startDate ?? undefined,
        endDate: query.endDate ?? undefined,
      }),
    );
  }

  return (
    <form
      action="/"
      method="get"
      role="search"
      aria-label="Search events"
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-xl border border-navy-700 bg-navy-800 p-1.5 shadow-[inset_0_1px_0_rgba(204,222,246,0.06)] transition focus-within:border-indigo/70"
    >
      <input
        type="search"
        name="keyword"
        defaultValue={query.keyword ?? ""}
        placeholder="Search events, artists, venues…"
        aria-label="Search events"
        maxLength={100}
        className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm text-ice placeholder:text-ice/40 focus:outline-none"
      />
      {/* No-JS fallback: keep the active filters when the form submits natively. */}
      {(["city", "category", "startDate", "endDate"] as const).map((name) =>
        query[name] ? <input key={name} type="hidden" name={name} value={query[name] ?? ""} /> : null,
      )}
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-ice transition hover:bg-purple-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
      >
        Search
      </button>
    </form>
  );
}
