-- PREPARED LOCALLY. Staging + backup/restore verification required before release.
-- No real rows are copied, deleted or assigned to a child by this migration.
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE public.user_login_summary FROM PUBLIC, anon, authenticated;

DO $migration$
DECLARE t record; policy_name text; mismatches bigint;
BEGIN
  -- Existing permissive policies remain; the restrictive policy is an additional AND.
  FOR t IN SELECT table_name FROM information_schema.columns
      WHERE table_schema='public' AND column_name='user_id'
        AND table_name IN ('babies','tried_foods','allergy_records','cooked_recipes',
          'favorite_recipes','custom_recipes','custom_foods','food_journal','login_events','feedback')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon',t.table_name);
    policy_name := 'db2_owner_guard';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',policy_name,t.table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id)',policy_name,t.table_name);
  END LOOP;
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;
  DROP POLICY IF EXISTS db2_owner_guard ON public.profiles;
  CREATE POLICY db2_owner_guard ON public.profiles AS RESTRICTIVE FOR ALL TO authenticated
    USING ((select auth.uid())=id) WITH CHECK ((select auth.uid())=id);

  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.babies'::regclass AND conname='db2_babies_id_owner') THEN
    ALTER TABLE public.babies ADD CONSTRAINT db2_babies_id_owner UNIQUE(id,user_id);
  END IF;
  FOR t IN SELECT c.table_name FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.column_name='baby_id'
      AND c.table_name IN ('tried_foods','allergy_records','cooked_recipes','favorite_recipes','food_journal')
      AND EXISTS(SELECT 1 FROM information_schema.columns u WHERE u.table_schema='public' AND u.table_name=c.table_name AND u.column_name='user_id')
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I r WHERE r.baby_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.babies b WHERE b.id=r.baby_id AND b.user_id=r.user_id)',t.table_name) INTO mismatches;
    IF mismatches>0 THEN RAISE EXCEPTION 'Ownership mismatch in %, rows %. Resolve explicitly before migration.',t.table_name,mismatches; END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=format('public.%I',t.table_name)::regclass AND conname='db2_child_owner_fk') THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT db2_child_owner_fk FOREIGN KEY(baby_id,user_id) REFERENCES public.babies(id,user_id) DEFERRABLE INITIALLY DEFERRED NOT VALID',t.table_name);
    END IF;
    EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT db2_child_owner_fk',t.table_name);
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.custom_recipes'::regclass AND conname='db2_custom_recipe_owner') THEN
    ALTER TABLE public.custom_recipes ADD CONSTRAINT db2_custom_recipe_owner UNIQUE(id,user_id);
  END IF;
  SELECT count(*) INTO mismatches FROM public.food_journal j WHERE j.custom_recipe_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.custom_recipes r WHERE r.id=j.custom_recipe_id AND r.user_id=j.user_id);
  IF mismatches>0 THEN RAISE EXCEPTION 'Custom recipe ownership mismatch, rows %',mismatches; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.food_journal'::regclass AND conname='db2_custom_recipe_owner_fk') THEN
    ALTER TABLE public.food_journal ADD CONSTRAINT db2_custom_recipe_owner_fk
      FOREIGN KEY(custom_recipe_id,user_id) REFERENCES public.custom_recipes(id,user_id) DEFERRABLE INITIALLY DEFERRED NOT VALID;
  END IF;
  ALTER TABLE public.food_journal VALIDATE CONSTRAINT db2_custom_recipe_owner_fk;
END $migration$;

-- Preserve legacy unassigned rows, but allow the same food for siblings.
DO $uniqueness$
DECLARE c record; duplicates bigint;
BEGIN
  SELECT count(*) INTO duplicates FROM (SELECT baby_id,food_id FROM public.tried_foods WHERE baby_id IS NOT NULL GROUP BY baby_id,food_id HAVING count(*)>1) x;
  IF duplicates>0 THEN RAISE EXCEPTION 'Duplicate child-food pairs require explicit reconciliation: %',duplicates; END IF;
  CREATE UNIQUE INDEX IF NOT EXISTS db2_tried_foods_child_food ON public.tried_foods(baby_id,food_id) WHERE baby_id IS NOT NULL;
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.tried_foods'::regclass AND contype='u'
    AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM unnest(conkey) k JOIN pg_attribute a ON a.attrelid=conrelid AND a.attnum=k)=ARRAY['food_id','user_id']
  LOOP EXECUTE format('ALTER TABLE public.tried_foods DROP CONSTRAINT %I',c.conname); END LOOP;
  CREATE UNIQUE INDEX IF NOT EXISTS db2_tried_foods_unassigned_food ON public.tried_foods(user_id,food_id) WHERE baby_id IS NULL;
END $uniqueness$;

-- A trigger function should not be an application-callable RPC.
ALTER FUNCTION public.handle_new_user() SET search_path=public,pg_temp;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;
COMMIT;
