-- Flexible planner (docs/product/V2-PLANNER-SPEC.md): several meals per child and day, chosen by the parent.
-- Expand-only and compatible with the build already deployed:
--   * every existing plan row keeps its day and recipe and becomes meal 'oricare' (one meal, no type);
--   * a client that sends no meal still writes 'oricare', exactly as before;
--   * no row is deleted or rewritten; V1 never reads or writes meal_plans.
-- Run supabase/operations/v2-planner-preflight.sql before, v2-planner-postflight.sql after;
-- supabase/operations/v2-planner-rollback.sql restores the previous functions without losing rows.
BEGIN;

-- 1. One recipe per meal, not per day.
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS meal text NOT NULL DEFAULT 'oricare';
ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_meal_check;
ALTER TABLE public.meal_plans ADD CONSTRAINT meal_plans_meal_check
  CHECK (meal IN ('mic-dejun','pranz','cina','gustare','oricare'));
ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_user_id_baby_id_planned_for_key;
ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_child_day_meal_key;
ALTER TABLE public.meal_plans ADD CONSTRAINT meal_plans_child_day_meal_key UNIQUE (user_id, baby_id, planned_for, meal);

-- 2. The parent's planner choices, per child: {"<baby_id>": {"meals": [...], "days": 5}}.
ALTER TABLE public.user_preferences ADD COLUMN IF NOT EXISTS planner jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_planner_check;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_planner_check
  CHECK (jsonb_typeof(planner) = 'object' AND octet_length(planner::text) <= 4096);

-- 3. Planner analytics: counts only (no recipe, no child, no text).
ALTER TABLE public.product_events DROP CONSTRAINT IF EXISTS product_events_event_name_check;
ALTER TABLE public.product_events ADD CONSTRAINT product_events_event_name_check CHECK (event_name IN (
  'onboarding_started','onboarding_completed','meal_suggestion_viewed','meal_selected','recipe_saved',
  'meal_added_to_plan','meal_used_confirmed','meal_reused','return_session','premium_interest',
  'recipe_viewed','shopping_list_generated','shopping_item_checked',
  'plan_generated','plan_saved','plan_meal_replaced'
));
ALTER TABLE public.product_events DROP CONSTRAINT IF EXISTS product_events_properties_check;
ALTER TABLE public.product_events ADD CONSTRAINT product_events_properties_check
  CHECK (jsonb_typeof(properties)='object' AND properties-ARRAY['count','elapsedMs','price','days','meals']='{}'::jsonb);

-- 4. State: each plan entry says its meal; the planner choices of the selected child come along.
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
    'plan',coalesce((SELECT jsonb_agg(jsonb_build_object('slot',planned_for,'meal',meal,'recipeId',recipe_id)
      ORDER BY planned_for,array_position(ARRAY['mic-dejun','pranz','cina','gustare','oricare'],meal))
      FROM public.meal_plans WHERE user_id=u AND baby_id=child),'[]'::jsonb),
    'planner',coalesce(pref.planner->child::text,'{}'::jsonb),
    'uses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'recipeId',recipe_id,'day',coalesce(meal_day,(cooked_at AT TIME ZONE 'Europe/Bucharest')::date),'confirmedAt',coalesce(action_recorded_at,cooked_at),'source',source) ORDER BY cooked_at)
      FROM public.cooked_recipes WHERE user_id=u AND (baby_id=child OR (baby_id IS NULL AND only_child))),'[]'::jsonb),
    'pantry',coalesce(to_jsonb(pref.pantry),'[]'::jsonb),'shoppingChecked',coalesce(to_jsonb(pref.shopping_checked),'[]'::jsonb),'events','[]'::jsonb
  ) INTO result;
  RETURN result;
END $$;

-- 5. Actions. Same body as deployed (allergy refusal already removed on 11 Nov), plus:
--    plan / remove-plan take an optional meal ('oricare' when absent: the deployed client keeps working);
--    plan-many saves up to 35 meals in ONE transaction (any invalid entry: nothing is saved);
--    planner-settings stores the parent's meals and days for this child.
CREATE OR REPLACE FUNCTION public.v2_apply_action(p_baby_id uuid,p_action text,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); r text:=p_payload->>'recipeId'; new_child uuid; v text; ids text[];
  m text:=coalesce(nullif(p_payload->>'meal',''),'oricare'); e jsonb; d date; today date:=(now() AT TIME ZONE 'Europe/Bucharest')::date;
  meals text[]; plan_days int;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>16384 THEN RAISE EXCEPTION 'invalid payload' USING ERRCODE='22023'; END IF;
  INSERT INTO public.user_preferences(user_id) VALUES(u) ON CONFLICT(user_id) DO NOTHING;
  PERFORM 1 FROM public.user_preferences WHERE user_id=u FOR UPDATE;
  IF p_action='create-child' THEN
    new_child=(p_payload->>'id')::uuid;
    INSERT INTO public.babies(id,user_id,name,feeding_stage) VALUES(new_child,u,coalesce(nullif(left(trim(p_payload->>'label'),40),''),'Copilul meu'),(p_payload->>'stage')::smallint)
      ON CONFLICT(id) DO NOTHING;
    IF NOT EXISTS(SELECT 1 FROM public.babies WHERE id=new_child AND user_id=u) THEN RAISE EXCEPTION 'child unavailable' USING ERRCODE='42501'; END IF;
    UPDATE public.user_preferences SET selected_baby_id=new_child,updated_at=now() WHERE user_id=u;
    RETURN public.v2_load_state(new_child);
  END IF;
  IF p_baby_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.babies WHERE id=p_baby_id AND user_id=u)
    THEN RAISE EXCEPTION 'child unavailable' USING ERRCODE='42501'; END IF;
  IF r IS NOT NULL AND (length(r)>100 OR r!~'^[a-z0-9-]+$') THEN RAISE EXCEPTION 'invalid recipe id' USING ERRCODE='22023'; END IF;
  IF m NOT IN ('mic-dejun','pranz','cina','gustare','oricare') THEN RAISE EXCEPTION 'invalid meal' USING ERRCODE='22023'; END IF;
  IF p_action IN ('plan','plan-many','confirm') AND (public.v2_load_state(p_baby_id)->>'stage')::smallint<6
    THEN RAISE EXCEPTION 'preparation stage has no meals' USING ERRCODE='42501'; END IF;
  IF p_action='select-child' THEN
    UPDATE public.user_preferences SET selected_baby_id=p_baby_id,updated_at=now() WHERE user_id=u;
  ELSIF p_action='profile' THEN
    UPDATE public.babies SET feeding_stage=(p_payload->>'stage')::smallint,updated_at=now() WHERE id=p_baby_id AND user_id=u;
    ids=ARRAY(SELECT jsonb_array_elements_text(p_payload->'introduced'));
    IF cardinality(ids)>100 THEN RAISE EXCEPTION 'too many foods' USING ERRCODE='22023'; END IF;
    -- Only the eight editable UI ingredients are reconciled; legacy foods are preserved.
    DELETE FROM public.tried_foods WHERE user_id=u AND baby_id=p_baby_id
      AND food_id=ANY(ARRAY['dovlecel','morcov','cartof','ovaz','banana','broccoli','orez','mar']) AND NOT(food_id=ANY(ids));
    FOREACH v IN ARRAY ids LOOP
      IF v=ANY(ARRAY['dovlecel','morcov','cartof','ovaz','banana','broccoli','orez','mar']) THEN
        INSERT INTO public.tried_foods(user_id,baby_id,food_id,food_name,first_tried_at) VALUES(u,p_baby_id,v,initcap(replace(v,'-',' ')),NULL)
          ON CONFLICT(baby_id,food_id) WHERE baby_id IS NOT NULL DO NOTHING;
      END IF;
    END LOOP;
    UPDATE public.user_preferences SET onboarded=true,selected_baby_id=p_baby_id,updated_at=now() WHERE user_id=u;
  ELSIF p_action='favorite' THEN
    IF (p_payload->>'enabled')::boolean THEN
      INSERT INTO public.favorite_recipes(user_id,recipe_id) SELECT u,r WHERE NOT EXISTS(SELECT 1 FROM public.favorite_recipes WHERE user_id=u AND recipe_id=r);
    ELSE DELETE FROM public.favorite_recipes WHERE user_id=u AND recipe_id=r; END IF;
  ELSIF p_action='plan' THEN
    INSERT INTO public.meal_plans(user_id,baby_id,planned_for,meal,recipe_id) VALUES(u,p_baby_id,(p_payload->>'slot')::date,m,r)
      ON CONFLICT(user_id,baby_id,planned_for,meal) DO UPDATE SET recipe_id=excluded.recipe_id,updated_at=now();
  ELSIF p_action='remove-plan' THEN
    DELETE FROM public.meal_plans WHERE user_id=u AND baby_id=p_baby_id AND planned_for=(p_payload->>'slot')::date AND meal=m;
  ELSIF p_action='plan-many' THEN
    IF jsonb_typeof(p_payload->'entries')<>'array' OR jsonb_array_length(p_payload->'entries') NOT BETWEEN 1 AND 35
      THEN RAISE EXCEPTION 'invalid plan' USING ERRCODE='22023'; END IF;
    FOR e IN SELECT value FROM jsonb_array_elements(p_payload->'entries') LOOP
      IF jsonb_typeof(e)<>'object' OR coalesce(e->>'recipeId','')!~'^[a-z0-9-]{1,100}$'
        OR coalesce(nullif(e->>'meal',''),'oricare') NOT IN ('mic-dejun','pranz','cina','gustare','oricare')
        OR coalesce(e->>'slot','')!~'^\d{4}-\d{2}-\d{2}$'
        THEN RAISE EXCEPTION 'invalid plan' USING ERRCODE='22023'; END IF;
      d=(e->>'slot')::date;
      IF d<today-1 OR d>today+14 THEN RAISE EXCEPTION 'invalid plan' USING ERRCODE='22023'; END IF;
      INSERT INTO public.meal_plans(user_id,baby_id,planned_for,meal,recipe_id) VALUES(u,p_baby_id,d,coalesce(nullif(e->>'meal',''),'oricare'),e->>'recipeId')
        ON CONFLICT(user_id,baby_id,planned_for,meal) DO UPDATE SET recipe_id=excluded.recipe_id,updated_at=now();
    END LOOP;
  ELSIF p_action='planner-settings' THEN
    meals=ARRAY(SELECT DISTINCT x FROM jsonb_array_elements_text(coalesce(p_payload->'meals','[]'::jsonb)) x);
    plan_days=(p_payload->>'days')::int;
    IF cardinality(meals) NOT BETWEEN 1 AND 4 OR NOT meals<@ARRAY['mic-dejun','pranz','cina','gustare'] OR plan_days NOT IN (1,3,5,7)
      THEN RAISE EXCEPTION 'invalid planner settings' USING ERRCODE='22023'; END IF;
    UPDATE public.user_preferences SET planner=planner||jsonb_build_object(p_baby_id::text,jsonb_build_object('meals',to_jsonb(meals),'days',plan_days)),updated_at=now()
      WHERE user_id=u;
  ELSIF p_action='confirm' THEN
    INSERT INTO public.cooked_recipes(id,user_id,baby_id,recipe_id,source) VALUES((p_payload->>'id')::uuid,u,p_baby_id,r,'v2_confirmed') ON CONFLICT DO NOTHING;
  ELSIF p_action='remove-use' THEN
    DELETE FROM public.cooked_recipes WHERE user_id=u AND baby_id=p_baby_id AND id=(p_payload->>'id')::uuid AND source='v2_confirmed';
  ELSIF p_action='preferences' THEN
    UPDATE public.user_preferences SET pantry=ARRAY(SELECT jsonb_array_elements_text(p_payload->'pantry')),
      shopping_checked=ARRAY(SELECT jsonb_array_elements_text(p_payload->'shoppingChecked')),updated_at=now() WHERE user_id=u;
  ELSE RAISE EXCEPTION 'unknown action' USING ERRCODE='22023'; END IF;
  RETURN public.v2_load_state(p_baby_id);
END $$;

REVOKE ALL ON FUNCTION public.v2_load_state(uuid),public.v2_apply_action(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v2_load_state(uuid),public.v2_apply_action(uuid,text,jsonb) TO authenticated;
COMMIT;
