import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "EventRadar Nigeria — Discover events across Nigeria",
    template: "%s · EventRadar Nigeria",
  },
  description:
    "Search real event listings from across Nigeria — concerts, sports, business, tech and more — aggregated from Bushdrum and nawhe.",
};

/** Radar sweep mark used as the site logo. */
function RadarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      <circle cx="12" cy="12" r="4.75" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <path d="M12 12 19.5 6.2" stroke="#9b9aff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15.6" cy="8.9" r="1.7" fill="#8e05c2" />
    </svg>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-700/80 bg-navy/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <RadarMark className="h-7 w-7 text-indigo transition-transform duration-300 group-hover:rotate-45" />
          <span className="text-lg font-semibold tracking-tight text-ice">
            EventRadar
            <span className="ml-1.5 rounded-full border border-purple/50 bg-purple/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-ice/85">
              Nigeria
            </span>
          </span>
        </Link>
        <p className="hidden text-sm text-ice/60 sm:block">
          Real events, one radar.
        </p>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-navy-700/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ice/60 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-xl space-y-1.5">
          <p>
            Event data courtesy of{" "}
            <a
              href="https://bushdrum.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 underline decoration-indigo-300/40 underline-offset-2 hover:decoration-indigo-300"
            >
              Bushdrum
            </a>{" "}
            and{" "}
            <a
              href="https://nawhe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 underline decoration-indigo-300/40 underline-offset-2 hover:decoration-indigo-300"
            >
              nawhe
            </a>
            .
          </p>
          <p className="text-ice/45">
            EventRadar Nigeria aggregates public listings and links out to the original event
            pages — it does not sell tickets or host events.
          </p>
        </div>
        <p className="shrink-0 text-ice/45">&copy; 2026 EventRadar Nigeria</p>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
