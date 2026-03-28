import { createClient } from "@/lib/supabase/client";

export const supabaseClient = createClient();

export { createClient as supabaseClientFactory } from "@/lib/supabase/client";

// NOTE: If Supabase inserts fail, run this SQL in Supabase SQL Editor to verify RLS policies:
// SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
// Make sure each table has: FOR ALL USING (true) or proper user_id check policies.
