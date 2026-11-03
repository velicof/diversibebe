-- Expand-only V1 compatibility: no row is changed.
-- Production (read-only metadata, 3 Nov 2026): 63% of tried_foods rows and all cooked_recipes
-- rows written by V1 have no baby_id. For a family with exactly one child those rows can only
-- belong to that child, so V2 shows them as that child's history. With several children the
-- owner is ambiguous and the rows stay out of per-child recommendations (safety first).
BEGIN;
CREATE OR REPLACE FUNCTION public.v2_load_state(p_baby_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); child uuid; pref public.user_preferences; stage smallint; result jsonb; only_child boolean;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO pref FROM public.user_preferences WHERE user_id=u;
  child=coalesce(p_baby_id,pref.selected_baby_id,(SELECT id FROM public.babies WHERE user_id=u ORDER BY created_at,id LIMIT 1));
  IF child IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.babies WHERE id=child AND user_id=u)
    THEN RAISE EXCEPTION 'child unavailable' USING ERRCODE='42501'; END IF;
  only_child=(SELECT count(*) FROM public.babies WHERE user_id=u)=1;
  SELECT CASE WHEN birthdate>current_date-interval '6 months' THEN 0 ELSE coalesce(feeding_stage,CASE WHEN birthdate IS NULL THEN 0
      WHEN birthdate<=current_date-interval '12 months' THEN 12 WHEN birthdate<=current_date-interval '10 months' THEN 10
      WHEN birthdate<=current_date-interval '8 months' THEN 8 ELSE 6 END) END INTO stage FROM public.babies WHERE id=child AND user_id=u;
  SELECT jsonb_build_object(
    'version',1,'onboarded',coalesce(pref.onboarded,false),'stage',coalesce(stage,0),
    'selectedBabyId',child,'journey',pref.journey_preferences->child::text,
    'requiresClinicalGuidance',EXISTS(SELECT 1 FROM public.allergy_records WHERE user_id=u AND (baby_id=child OR baby_id IS NULL)),
    'children',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'label',name) ORDER BY created_at,id) FROM public.babies WHERE user_id=u),'[]'::jsonb),
    'introduced',coalesce((SELECT jsonb_agg(DISTINCT food_id) FROM public.tried_foods
      WHERE user_id=u AND (baby_id=child OR (baby_id IS NULL AND only_child))),'[]'::jsonb),
    'favorites',coalesce((SELECT jsonb_agg(DISTINCT recipe_id) FROM public.favorite_recipes WHERE user_id=u),'[]'::jsonb),
    'plan',coalesce((SELECT jsonb_agg(jsonb_build_object('slot',planned_for,'recipeId',recipe_id) ORDER BY planned_for) FROM public.meal_plans WHERE user_id=u AND baby_id=child),'[]'::jsonb),
    'uses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'recipeId',recipe_id,'day',coalesce(meal_day,(cooked_at AT TIME ZONE 'Europe/Bucharest')::date),'confirmedAt',coalesce(action_recorded_at,cooked_at),'source',source) ORDER BY cooked_at)
      FROM public.cooked_recipes WHERE user_id=u AND (baby_id=child OR (baby_id IS NULL AND only_child))),'[]'::jsonb),
    'pantry',coalesce(to_jsonb(pref.pantry),'[]'::jsonb),'shoppingChecked',coalesce(to_jsonb(pref.shopping_checked),'[]'::jsonb),'events','[]'::jsonb
  ) INTO result;
  RETURN result;
END $$;
COMMIT;
