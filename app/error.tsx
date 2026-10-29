"use client";

/**
 * Route-level error boundary for unexpected failures. Expected provider
 * problems are handled inline by the feed; this is the last resort.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h2 className="text-xl font-semibold text-ice">Something went sideways</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ice/60">
        The page hit an unexpected problem while loading. Your filters are untouched — try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-purple px-5 py-2.5 text-sm font-medium text-ice transition hover:bg-purple-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
      >
        Try again
      </button>
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-ice/35">Reference: {error.digest}</p>
      )}
    </div>
  );
}
