import type { NextConfig } from "next";
import { PRIVATE_ROUTE_PREFIXES } from "./src/app/lib/site";

const nextConfig: NextConfig = {
  // Vercel reads the build from .next. Locally, V2_DIST_DIR lets a second build (e.g. performance comparison)
  // run beside the default preview.
  distDir: process.env.VERCEL ? ".next" : process.env.V2_DIST_DIR || ".next-v2",
  // No image-optimisation service (paid beyond the free quota): static V2 images have pre-generated widths;
  // every other image, V1's included, is served as it is, as with main's unoptimized setting.
  images: { loader: "custom", loaderFile: "./src/image-loader.ts" },
  // Attributing main-thread time to source modules in performance analysis; off in every normal build.
  productionBrowserSourceMaps: process.env.V2_SOURCE_MAPS === "1",
  experimental: { cpus: 1, webpackBuildWorker: false, webpackMemoryOptimizations: true },
  // Photo candidates are read from disk by the gated review route; they are never in public/.
  outputFileTracingIncludes: { "/v2/revizie/foto/[id]/[width]": ["./content/photo-candidates/**"] },
  async headers() {
    // Private and auth pages must never appear in search results, even if linked externally.
    return PRIVATE_ROUTE_PREFIXES.flatMap((prefix) => [
      { source: prefix, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: `${prefix}/:path*`, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ]);
  },
};

export default nextConfig;
