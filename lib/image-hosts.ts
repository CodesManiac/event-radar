/**
 * Image hosts the Next.js optimizer is allowed to proxy.
 *
 * Single source of truth shared by `next.config.ts` (remotePatterns) and the
 * event card (deciding between an optimized `<Image>` and a plain lazy
 * `<img>`). Providers serve images from arbitrary organizer CDNs, so anything
 * outside this list must never be fetched server-side — the browser loads it
 * directly and a dead URL simply degrades to the card's background.
 */

export const OPTIMIZED_IMAGE_HOSTS = [
  "cdn-ip.allevents.in",
  "img.evbuc.com",
  "cdn.prod.website-files.com",
  "nawhe.com",
] as const;

const OPTIMIZED_HOST_SET: ReadonlySet<string> = new Set(OPTIMIZED_IMAGE_HOSTS);

/** True only for https URLs on an allowlisted optimizer host. */
export function canOptimizeImage(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && OPTIMIZED_HOST_SET.has(hostname);
  } catch {
    return false;
  }
}
