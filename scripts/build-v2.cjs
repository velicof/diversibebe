const { spawnSync } = require("node:child_process");
const path = require("node:path");
const testUrl =
  process.env.NEXT_PUBLIC_V2_SUPABASE_URL || "http://127.0.0.1:54329";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(testUrl).hostname))
  throw new Error("V2 build permits loopback test services only");
const result = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build", "--webpack"],
  {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      DIVERSIBEBE_V2_PREVIEW: "1",
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
    },
  },
);
process.exit(result.status ?? 1);
