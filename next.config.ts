import type { NextConfig } from "next";
import { PRIVATE_ROUTE_PREFIXES } from "./src/app/lib/site";

const nextConfig: NextConfig = {
  distDir: ".next-v2",
  experimental: { cpus: 1, webpackBuildWorker: false, webpackMemoryOptimizations: true },
  async headers() {
    // Private and auth pages must never appear in search results, even if linked externally.
    return PRIVATE_ROUTE_PREFIXES.flatMap((prefix) => [
      { source: prefix, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: `${prefix}/:path*`, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ]);
  },
};

export default nextConfig;
