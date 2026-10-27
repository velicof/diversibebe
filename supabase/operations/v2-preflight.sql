-- READ ONLY. Aggregate diagnostics, never export family records.
BEGIN TRANSACTION READ ONLY;
SELECT table_name,column_name,data_type,is_nullable
FROM information_schema.columns WHERE table_schema='public'
AND table_name IN ('babies','profiles','tried_foods','cooked_recipes','favorite_recipes','allergy_records')
ORDER BY table_name,ordinal_position;
SELECT 'tried_foods_child_owner' AS check_name,count(*) AS anomalies
FROM public.tried_foods r WHERE r.baby_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.babies b WHERE b.id=r.baby_id AND b.user_id=r.user_id)
UNION ALL SELECT 'journal_child_owner',count(*) FROM public.food_journal r WHERE r.baby_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.babies b WHERE b.id=r.baby_id AND b.user_id=r.user_id)
UNION ALL SELECT 'allergy_child_owner',count(*) FROM public.allergy_records r WHERE r.baby_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.babies b WHERE b.id=r.baby_id AND b.user_id=r.user_id)
UNION ALL SELECT 'duplicate_child_food',count(*) FROM(SELECT baby_id,food_id FROM public.tried_foods WHERE baby_id IS NOT NULL GROUP BY baby_id,food_id HAVING count(*)>1) duplicates
UNION ALL SELECT 'custom_recipe_owner',count(*) FROM public.food_journal r WHERE r.custom_recipe_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.custom_recipes c WHERE c.id=r.custom_recipe_id AND c.user_id=r.user_id);
SELECT grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='user_login_summary';
ROLLBACK;
