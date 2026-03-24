-- DiversiBebe MVP: cloud sync for profile extensions, journal (food entries), allergies.
-- Run in Supabase SQL editor or via CLI. Adjust if `profiles` already has these columns.

-- Profile fields used by /api/data/sync (Google sign-in still inserts email, name, image only)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_name text,
  ADD COLUMN IF NOT EXISTS baby_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

COMMENT ON COLUMN public.profiles.baby_json IS 'BabyProfile JSON: name, birthDate, weight, gender, allergies[], diversificationStartDate';

CREATE TABLE IF NOT EXISTS public.food_entries (
  id text PRIMARY KEY,
  user_email text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_entries_user_email_idx ON public.food_entries (user_email);

CREATE TABLE IF NOT EXISTS public.allergy_records (
  id text PRIMARY KEY,
  user_email text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS allergy_records_user_email_idx ON public.allergy_records (user_email);
