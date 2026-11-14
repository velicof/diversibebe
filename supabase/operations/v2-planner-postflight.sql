-- READ ONLY. After 20261113100000_v2_flexible_planner.sql. Every "ok" must be true and the counts must equal
-- the ones printed by v2-planner-preflight.sql.
BEGIN TRANSACTION READ ONLY;
SELECT check_name, ok, detail FROM (
  SELECT 1 AS n,'meal column, not null, default oricare' AS check_name,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='meal_plans' AND column_name='meal'
      AND is_nullable='NO' AND column_default LIKE '''oricare''%') AS ok,'' AS detail
  UNION ALL SELECT 2,'unique per child, day and meal',
    EXISTS(SELECT 1 FROM pg_constraint WHERE conname='meal_plans_child_day_meal_key' AND conrelid='public.meal_plans'::regclass),''
  UNION ALL SELECT 3,'old one-row-per-day unique constraint gone',
    NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='meal_plans_user_id_baby_id_planned_for_key'),''
  UNION ALL SELECT 4,'every existing row became oricare',
    NOT EXISTS(SELECT 1 FROM public.meal_plans WHERE created_at<now()-interval '1 minute' AND meal<>'oricare' AND updated_at<now()-interval '1 minute'),''
  UNION ALL SELECT 5,'plan owner policy unchanged (owner + stage, no allergy clause)',
    (SELECT pg_get_expr(polwithcheck,polrelid) LIKE '%babies%' AND pg_get_expr(polwithcheck,polrelid) NOT LIKE '%allergy%' FROM pg_policy WHERE polname='v2_plan_owner'),''
  UNION ALL SELECT 6,'apply_action knows plan-many and planner-settings, no allergy refusal',
    position('plan-many' IN pg_get_functiondef('public.v2_apply_action(uuid,text,jsonb)'::regprocedure))>0
    AND position('planner-settings' IN pg_get_functiondef('public.v2_apply_action(uuid,text,jsonb)'::regprocedure))>0
    AND position('individual guidance' IN pg_get_functiondef('public.v2_apply_action(uuid,text,jsonb)'::regprocedure))=0,''
  UNION ALL SELECT 7,'load_state returns meal and planner',
    position('''meal'',meal' IN pg_get_functiondef('public.v2_load_state(uuid)'::regprocedure))>0
    AND position('''planner''' IN pg_get_functiondef('public.v2_load_state(uuid)'::regprocedure))>0,''
  UNION ALL SELECT 8,'only authenticated (and owners) can execute the RPCs',
    NOT has_function_privilege('anon','public.v2_apply_action(uuid,text,jsonb)','EXECUTE')
    AND has_function_privilege('authenticated','public.v2_apply_action(uuid,text,jsonb)','EXECUTE')
    AND NOT has_function_privilege('anon','public.v2_load_state(uuid)','EXECUTE'),''
  UNION ALL SELECT 9,'planner events allowed',
    position('plan_generated' IN (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='product_events_event_name_check'))>0,''
  UNION ALL SELECT 20,'meal_plans rows',true,(SELECT count(*)::text FROM public.meal_plans)
  UNION ALL SELECT 21,'families with a plan',true,(SELECT count(DISTINCT user_id)::text FROM public.meal_plans)
  UNION ALL SELECT 22,'user_preferences rows',true,(SELECT count(*)::text FROM public.user_preferences)
  UNION ALL SELECT 23,'product_events rows',true,(SELECT count(*)::text FROM public.product_events)
  UNION ALL SELECT 24,'allergy_records rows (V1, must not change)',true,(SELECT count(*)::text FROM public.allergy_records)
  UNION ALL SELECT 25,'tried_foods rows (V1, must not change)',true,(SELECT count(*)::text FROM public.tried_foods)
) checks ORDER BY n;
ROLLBACK;
