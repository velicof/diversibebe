const { spawn } = require("node:child_process");
const path = require("node:path");
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    process.argv.includes("--dev") ? "dev" : "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: {
      ...process.env,
      DIVERSIBEBE_V2_PREVIEW: "1",
      NEXT_PUBLIC_V2_SUPABASE_URL:
        process.env.NEXT_PUBLIC_V2_SUPABASE_URL || "http://127.0.0.1:54329",
      NEXT_PUBLIC_V2_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_V2_SUPABASE_ANON_KEY || "local-test-public-key",
      NEXT_PUBLIC_V2_BACKEND_KIND:
        process.env.NEXT_PUBLIC_V2_BACKEND_KIND || "contract-fixture",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-preview-only",
      NEXT_TELEMETRY_DISABLED: "1",
      RAYON_NUM_THREADS: "1",
    },
  },
);
process.on("SIGINT", () => child.kill());
child.on("exit", (code) => process.exit(code ?? 0));
