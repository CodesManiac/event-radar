import { Suspense } from "react";
import { EventsExplorer } from "@/components/events-explorer";
import { FeedSkeleton } from "@/components/skeletons";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Landing page: static hero shell + streamed feed.
 *
 * `searchParams` is awaited inside the explorer (below the Suspense
 * boundary), so the hero and header render from the static shell while the
 * filter/results area streams in with real provider data.
 */
export default function HomePage({ searchParams }: HomePageProps) {
  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-purple/25 blur-[120px]" />
          <div className="absolute right-[-120px] top-32 h-72 w-72 rounded-full bg-indigo/20 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo/40 bg-indigo/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-ice/85">
            Live listings across Nigeria
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-ice sm:text-5xl">
            Every event in Nigeria,{" "}
            <span className="bg-gradient-to-r from-purple-bright via-indigo to-indigo-300 bg-clip-text text-transparent">
              on one radar.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ice/65">
            Search real listings from Bushdrum and nawhe — concerts, sports, business, tech and
            community gatherings — updated live and linking straight to the source. No ticket
            sales, no invented events.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        <Suspense fallback={<FeedSkeleton />}>
          <EventsExplorer searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}
