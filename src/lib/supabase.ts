import { createClient } from "@supabase/supabase-js";

// ⚠️ Public anon client — safe for client-side use.
// For server-side admin operations, use `@/lib/supabase-server` instead.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(url ?? "", key ?? "");
