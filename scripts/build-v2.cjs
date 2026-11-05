const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { buildStamp } = require("./build-stamp.cjs");
const testUrl =
  process.env.NEXT_PUBLIC_V2_SUPABASE_URL || "http://127.0.0.1:54329";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(testUrl).hostname))
  throw new Error("V2 build permits loopback test services only");
// The browser ships the precomputed catalog: refuse to build from a stale one.
const check = spawnSync(process.execPath, [path.join(__dirname, "generate-catalog.cjs"), "--check"], { stdio: "inherit" });
if (check.status !== 0) process.exit(1);
const result = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build", "--webpack"],
  {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      DIVERSIBEBE_V2_PREVIEW: "1",
      NEXT_PUBLIC_V2_BUILD: buildStamp(),
      // Local QA only: unreviewed editorial content, clearly labelled in the UI. Never set for real families.
      NEXT_PUBLIC_V2_CONTENT_MODE: process.env.NEXT_PUBLIC_V2_CONTENT_MODE || "preview",
      NEXT_PUBLIC_V2_SUPABASE_URL: testUrl,
      NEXT_PUBLIC_V2_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_V2_SUPABASE_ANON_KEY || "local-test-public-key",
      NEXT_PUBLIC_V2_BACKEND_KIND:
        process.env.NEXT_PUBLIC_V2_BACKEND_KIND || "contract-fixture",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-preview-only",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=4096",
      RAYON_NUM_THREADS: "1",
      // V2_BACKEND=phone: the browser reaches the local stack through its own address (scripts/phone-preview.cjs).
      ...(process.env.V2_BACKEND === "phone" ? { NEXT_PUBLIC_V2_SUPABASE_URL: "same-origin", NEXT_PUBLIC_V2_BACKEND_KIND: "supabase-native" } : {}),
      // V2_BACKEND=none: visitor-only build (no V2 account backend in the browser), as the Vercel Preview
      // stage 1 and the private phone preview (docs/ai-ops/PHONE-PREVIEW.md). Choices stay on the device.
      ...(process.env.V2_BACKEND === "none" ? { NEXT_PUBLIC_V2_SUPABASE_URL: "", NEXT_PUBLIC_V2_SUPABASE_ANON_KEY: "", NEXT_PUBLIC_V2_BACKEND_KIND: "" } : {}),
    },
  },
);
process.exit(result.status ?? 1);
