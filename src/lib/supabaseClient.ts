import { createClient } from "@supabase/supabase-js";

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

// NOTE: If Supabase inserts fail, run this SQL in Supabase SQL Editor to verify RLS policies:
// SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
// Make sure each table has: FOR ALL USING (true) or proper user_id check policies.

