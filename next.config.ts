import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-v2",
  experimental: { cpus: 1, webpackBuildWorker: false, webpackMemoryOptimizations: true },
};

export default nextConfig;
