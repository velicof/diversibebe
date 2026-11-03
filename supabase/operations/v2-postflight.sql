-- READ ONLY. Run right after the release migrations (and again after any rollback).
-- Every row must have ok = true. Row counts must equal the preflight counts (V1 rows are never changed).
BEGIN TRANSACTION READ ONLY;
SELECT check_name,ok,detail FROM (
  SELECT 'v2_tables_present' check_name,count(*)=3 ok,count(*)::text detail FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('meal_plans','user_preferences','product_events')
  UNION ALL SELECT 'owner_guards_restrictive',count(*)=11,count(*)::text FROM pg_policies WHERE schemaname='public' AND policyname='db2_owner_guard' AND permissive='RESTRICTIVE'
  UNION ALL SELECT 'child_owner_fks_validated',count(*)=4 AND bool_and(convalidated),count(*)::text FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('db2_child_owner_fk','v2_cooked_child_owner')
  UNION ALL SELECT 'legacy_unique_replaced',NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname IN ('tried_foods_user_id_food_id_key','cooked_recipes_user_recipe_unique'))
      AND (SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN ('db2_tried_foods_child_food','db2_tried_foods_unassigned_food','cooked_legacy_user_recipe'))=3,''
  UNION ALL SELECT 'anon_no_family_tables',NOT bool_or(has_table_privilege('anon',format('public.%I',t),'SELECT')),'' FROM unnest(ARRAY['profiles','babies','tried_foods','food_journal','allergy_records','favorite_recipes','cooked_recipes','custom_recipes','custom_foods','login_events','feedback','meal_plans','user_preferences','product_events']) t
  UNION ALL SELECT 'login_summary_closed',NOT has_table_privilege('anon','public.user_login_summary','SELECT') AND NOT has_table_privilege('authenticated','public.user_login_summary','SELECT'),''
  UNION ALL SELECT 'v2_rpcs_authenticated_only',bool_and(has_function_privilege('authenticated',p.oid,'EXECUTE') AND NOT has_function_privilege('anon',p.oid,'EXECUTE')),count(*)::text
    FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('v2_load_state','v2_apply_action','v2_record_event','v2_save_journey','v2_edit_child','v2_mark_legacy_recipe')
  UNION ALL SELECT 'handle_new_user_hardened',coalesce(array_to_string(proconfig,';'),'') LIKE '%search_path%' AND NOT has_function_privilege('authenticated',oid,'EXECUTE'),'' FROM pg_proc WHERE oid='public.handle_new_user()'::regprocedure
  UNION ALL SELECT 'signup_trigger_present',count(*)=1,'' FROM pg_trigger WHERE tgname='on_auth_user_created' AND tgrelid='auth.users'::regclass
) checks;
SELECT 'auth.users' t,count(*) n FROM auth.users UNION ALL SELECT 'profiles',count(*) FROM public.profiles
UNION ALL SELECT 'babies',count(*) FROM public.babies UNION ALL SELECT 'tried_foods',count(*) FROM public.tried_foods
UNION ALL SELECT 'food_journal',count(*) FROM public.food_journal UNION ALL SELECT 'allergy_records',count(*) FROM public.allergy_records
UNION ALL SELECT 'favorite_recipes',count(*) FROM public.favorite_recipes UNION ALL SELECT 'cooked_recipes',count(*) FROM public.cooked_recipes
UNION ALL SELECT 'custom_recipes',count(*) FROM public.custom_recipes UNION ALL SELECT 'custom_foods',count(*) FROM public.custom_foods;
ROLLBACK;
