-- Rețete proprii (custom) + legătură în jurnal
-- Rulează în Supabase SQL Editor (sau via CLI migrate).

-- ---------------------------------------------------------------------------
-- 1. Tabel custom_recipes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_recipes (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS custom_recipes_user_id_idx
  ON public.custom_recipes (user_id);

CREATE INDEX IF NOT EXISTS custom_recipes_created_at_idx
  ON public.custom_recipes (created_at DESC);

COMMENT ON TABLE public.custom_recipes IS
  'Rețete create de utilizator (ex. Iaurt cu piersici). ingredients: [{id,name,emoji}, ...]';

-- ---------------------------------------------------------------------------
-- 2. RLS (același pattern ca custom_foods)
-- ---------------------------------------------------------------------------
ALTER TABLE public.custom_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own custom recipes" ON public.custom_recipes;
CREATE POLICY "Users can manage own custom recipes"
  ON public.custom_recipes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Coloană nouă pe food_journal (nullable — rândurile existente rămân neschimbate)
-- ---------------------------------------------------------------------------
ALTER TABLE public.food_journal
  ADD COLUMN IF NOT EXISTS custom_recipe_id TEXT NULL
    REFERENCES public.custom_recipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS food_journal_custom_recipe_id_idx
  ON public.food_journal (custom_recipe_id)
  WHERE custom_recipe_id IS NOT NULL;
