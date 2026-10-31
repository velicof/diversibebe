-- Isolated development only. No production application authorized.
BEGIN;
ALTER TABLE public.user_preferences ADD COLUMN journey_preferences jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(journey_preferences)='object' AND octet_length(journey_preferences::text)<=131072);
CREATE OR REPLACE FUNCTION public.v2_load_state(p_baby_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); child uuid; pref public.user_preferences; stage smallint; result jsonb;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO pref FROM public.user_preferences WHERE user_id=u;
  child=coalesce(p_baby_id,pref.selected_baby_id,(SELECT id FROM public.babies WHERE user_id=u ORDER BY created_at,id LIMIT 1));
  IF child IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.babies WHERE id=child AND user_id=u)
    THEN RAISE EXCEPTION 'child unavailable' USING ERRCODE='42501'; END IF;
  SELECT CASE WHEN birthdate>current_date-interval '6 months' THEN 0 ELSE coalesce(feeding_stage,CASE WHEN birthdate IS NULL THEN 0
      WHEN birthdate<=current_date-interval '12 months' THEN 12 WHEN birthdate<=current_date-interval '10 months' THEN 10
      WHEN birthdate<=current_date-interval '8 months' THEN 8 ELSE 6 END) END INTO stage FROM public.babies WHERE id=child AND user_id=u;
  SELECT jsonb_build_object(
    'version',1,'onboarded',coalesce(pref.onboarded,false),'stage',coalesce(stage,0),
    'selectedBabyId',child,'journey',pref.journey_preferences->child::text,
    'requiresClinicalGuidance',EXISTS(SELECT 1 FROM public.allergy_records WHERE user_id=u AND (baby_id=child OR baby_id IS NULL)),
    'children',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'label',name) ORDER BY created_at,id) FROM public.babies WHERE user_id=u),'[]'::jsonb),
    'introduced',coalesce((SELECT jsonb_agg(food_id) FROM public.tried_foods WHERE user_id=u AND baby_id=child),'[]'::jsonb),
    'favorites',coalesce((SELECT jsonb_agg(DISTINCT recipe_id) FROM public.favorite_recipes WHERE user_id=u),'[]'::jsonb),
    'plan',coalesce((SELECT jsonb_agg(jsonb_build_object('slot',planned_for,'recipeId',recipe_id) ORDER BY planned_for) FROM public.meal_plans WHERE user_id=u AND baby_id=child),'[]'::jsonb),
    'uses',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'recipeId',recipe_id,'day',coalesce(meal_day,(cooked_at AT TIME ZONE 'Europe/Bucharest')::date),'confirmedAt',coalesce(action_recorded_at,cooked_at),'source',source) ORDER BY cooked_at) FROM public.cooked_recipes WHERE user_id=u AND baby_id=child),'[]'::jsonb),
    'pantry',coalesce(to_jsonb(pref.pantry),'[]'::jsonb),'shoppingChecked',coalesce(to_jsonb(pref.shopping_checked),'[]'::jsonb),'events','[]'::jsonb
  ) INTO result;
  RETURN result;
END $$;


CREATE FUNCTION public.v2_save_journey(p_baby_id uuid,p_preferences jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); j jsonb:=p_preferences;
BEGIN
 IF u IS NULL OR NOT EXISTS(SELECT 1 FROM public.babies WHERE id=p_baby_id AND user_id=u) THEN RAISE EXCEPTION 'child unavailable' USING ERRCODE='42501'; END IF;
 IF j IS NULL OR jsonb_typeof(j)<>'object' OR octet_length(j::text)>4096
 OR j-ARRAY['version','id','step','challenge','ageBand','context','pantry','startedAt','completed','guideSaved','resultIds']<>'{}'::jsonb
 OR NOT(j ?& ARRAY['version','id','step','challenge','ageBand','context','pantry','startedAt','completed','guideSaved','resultIds'])
 OR j->>'version'<>'1' OR j->>'id'!~'^[a-f0-9-]{36}$' OR j->>'step'!~'^[0-3]$'
 OR jsonb_typeof(j->'startedAt')<>'number' OR (j->>'startedAt')::numeric<=0 OR (j->>'startedAt')::numeric>9999999999999
 OR jsonb_typeof(j->'completed')<>'boolean' OR jsonb_typeof(j->'guideSaved')<>'boolean'
 OR (j->>'challenge' IS NOT NULL AND j->>'challenge'<>ALL(ARRAY['ideas','beginning','refusal','time','planning','serving']))
 OR (j->>'ageBand' IS NOT NULL AND j->>'ageBand'<>ALL(ARRAY['preparing','6-8','9-12','13-18','19-24','over24']))
 OR (j->>'context' IS NOT NULL AND j->>'context'<>ALL(ARRAY['readiness','serving','safety','under15','15to30','over30','no-pressure','familiar','today','few-days','fridge']))
 OR jsonb_typeof(j->'pantry')<>'array' OR jsonb_typeof(j->'resultIds')<>'array'
 THEN RAISE EXCEPTION 'invalid journey' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(j->'pantry')>8 OR jsonb_array_length(j->'resultIds')>3
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(j->'pantry') x WHERE x<>ALL(ARRAY['dovlecel','morcov','cartof','ovaz','banana','broccoli','orez','mar']))
 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(j->'resultIds') x WHERE x!~'^[a-z0-9-]{1,100}$')
 OR (j->>'completed'='true' AND (j->>'step'<>'3' OR j->>'challenge' IS NULL OR j->>'ageBand' IS NULL))
 THEN RAISE EXCEPTION 'invalid journey choices' USING ERRCODE='22023'; END IF;
 INSERT INTO public.user_preferences(user_id) VALUES(u) ON CONFLICT(user_id) DO NOTHING;
 UPDATE public.user_preferences SET journey_preferences=jsonb_set(journey_preferences,ARRAY[p_baby_id::text],j),updated_at=now() WHERE user_id=u;
 RETURN public.v2_load_state(p_baby_id);
END $$;
CREATE FUNCTION public.v2_edit_child(p_baby_id uuid,p_label text,p_stage smallint) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.babies WHERE id=p_baby_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'child unavailable' USING ERRCODE='42501'; END IF;
 IF p_label IS NULL OR length(trim(p_label)) NOT BETWEEN 1 AND 40 OR p_stage IS NULL OR p_stage<>ALL(ARRAY[0,6,8,10,12]) THEN RAISE EXCEPTION 'invalid profile' USING ERRCODE='22023'; END IF;
 UPDATE public.babies SET name=trim(p_label),feeding_stage=p_stage,updated_at=now() WHERE id=p_baby_id AND user_id=auth.uid();
 RETURN public.v2_load_state(p_baby_id);
END $$;
REVOKE ALL ON FUNCTION public.v2_save_journey(uuid,jsonb),public.v2_edit_child(uuid,text,smallint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v2_save_journey(uuid,jsonb),public.v2_edit_child(uuid,text,smallint) TO authenticated;
COMMIT;
