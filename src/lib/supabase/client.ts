import { createBrowserClient } from "@supabase/ssr";

// After this migration, run this SQL in Supabase to restore proper RLS:
// DROP POLICY IF EXISTS "allow_all_food_journal" ON food_journal;
// CREATE POLICY "Users can manage own journal" ON food_journal FOR ALL USING (auth.uid() = user_id);
// (repeat for all tables)
// This works now because Supabase Auth is used natively.

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
