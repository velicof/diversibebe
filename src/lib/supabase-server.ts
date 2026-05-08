// ============================================================
// 🔒 SERVER-ONLY Supabase client — uses the service role key.
//
// ⛔ NEVER import this file in client components ("use client")
//    or any file that could be bundled for the browser.
//    The service role key bypasses Row Level Security and has
//    full admin access to the database.
//
// ✅ Safe to use in:
//    - API route handlers (src/app/api/...)
//    - Server Components (without "use client")
//    - Middleware
// ============================================================

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (typeof window !== "undefined") {
  throw new Error(
    "supabase-server.ts was imported in a browser context. " +
      "This file contains the service role key and must only run on the server."
  );
}

export const supabaseAdmin = createClient(url ?? "", serviceRoleKey ?? "");
