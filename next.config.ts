import type { NextConfig } from "next";
import { OPTIMIZED_IMAGE_HOSTS } from "./lib/image-hosts";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    /**
     * Provider image hosts observed in verified payloads (see
     * `lib/image-hosts.ts`); anything else fails closed instead of being
     * proxied through the server. The event card renders such hosts as a
     * plain lazy <img> rather than crashing on the unconfigured hostname.
     */
    remotePatterns: OPTIMIZED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
