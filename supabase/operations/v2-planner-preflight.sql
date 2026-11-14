-- READ ONLY. Before 20261113100000_v2_flexible_planner.sql. Aggregates only, never family records.
-- Every "ok" must be true; keep the counts: v2-planner-postflight.sql must show the same numbers.
BEGIN TRANSACTION READ ONLY;
SELECT check_name, ok, detail FROM (
  -- The schema is the one the migration was written for.
  SELECT 1 AS n,'meal_plans has no meal column yet' AS check_name,
    NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='meal_plans' AND column_name='meal') AS ok,'' AS detail
  UNION ALL SELECT 2,'one-row-per-day unique constraint present',
    EXISTS(SELECT 1 FROM pg_constraint WHERE conname='meal_plans_user_id_baby_id_planned_for_key' AND conrelid='public.meal_plans'::regclass),''
  UNION ALL SELECT 3,'v2_apply_action no longer refuses allergies (11 Nov migration applied)',
    position('individual guidance' IN pg_get_functiondef('public.v2_apply_action(uuid,text,jsonb)'::regprocedure))=0,''
  UNION ALL SELECT 4,'v2_apply_action is the expected body (one-meal plan upsert)',
    position('ON CONFLICT(user_id,baby_id,planned_for) DO UPDATE' IN pg_get_functiondef('public.v2_apply_action(uuid,text,jsonb)'::regprocedure))>0,''
  UNION ALL SELECT 5,'v2_load_state is the legacy-history version',
    position('only_child' IN pg_get_functiondef('public.v2_load_state(uuid)'::regprocedure))>0,''
  UNION ALL SELECT 6,'product event constraints have the expected names',
    (SELECT count(*) FROM pg_constraint WHERE conrelid='public.product_events'::regclass AND conname IN ('product_events_event_name_check','product_events_properties_check'))=2,''
  UNION ALL SELECT 7,'no plan row owned by another family''s child',
    NOT EXISTS(SELECT 1 FROM public.meal_plans p WHERE NOT EXISTS(SELECT 1 FROM public.babies b WHERE b.id=p.baby_id AND b.user_id=p.user_id)),''
  -- Counts to compare after the migration.
  UNION ALL SELECT 20,'meal_plans rows',true,(SELECT count(*)::text FROM public.meal_plans)
  UNION ALL SELECT 21,'families with a plan',true,(SELECT count(DISTINCT user_id)::text FROM public.meal_plans)
  UNION ALL SELECT 22,'user_preferences rows',true,(SELECT count(*)::text FROM public.user_preferences)
  UNION ALL SELECT 23,'product_events rows',true,(SELECT count(*)::text FROM public.product_events)
  UNION ALL SELECT 24,'allergy_records rows (V1, must not change)',true,(SELECT count(*)::text FROM public.allergy_records)
  UNION ALL SELECT 25,'tried_foods rows (V1, must not change)',true,(SELECT count(*)::text FROM public.tried_foods)
) checks ORDER BY n;
ROLLBACK;
