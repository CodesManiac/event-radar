import { FeedSkeleton } from "@/components/skeletons";

/** Route-level fallback shown while a navigation's payload streams in. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <FeedSkeleton />
    </div>
  );
}
