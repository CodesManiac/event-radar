/** Radar sweep mark used as the site logo and decorative motif. */
export function RadarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <circle cx="12" cy="12" r="4.75" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <path d="M12 12 19.5 6.2" stroke="#9b9aff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15.6" cy="8.9" r="1.7" fill="#8e05c2" />
    </svg>
  );
}
