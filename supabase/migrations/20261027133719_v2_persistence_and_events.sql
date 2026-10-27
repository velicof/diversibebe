-- LOCAL/STAGING ONLY until the explicit production release gate is approved.
-- Reuses babies, tried_foods, favorite_recipes and cooked_recipes.
BEGIN;
ALTER TABLE public.babies ADD COLUMN IF NOT EXISTS feeding_stage smallint
  CHECK(feeding_stage IN (0,6,8,10,12));
ALTER TABLE public.cooked_recipes
  ADD COLUMN IF NOT EXISTS baby_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'legacy' CHECK(source IN ('legacy','v2_confirmed','local_import')),
  ADD COLUMN IF NOT EXISTS action_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS meal_day date;
ALTER TABLE public.cooked_recipes ADD CONSTRAINT v2_cooked_child_owner
  FOREIGN KEY(baby_id,user_id) REFERENCES public.babies(id,user_id);
CREATE UNIQUE INDEX v2_cooked_day_dedup ON public.cooked_recipes(user_id,baby_id,recipe_id,meal_day)
  WHERE source='v2_confirmed';
CREATE INDEX v2_cooked_child_time ON public.cooked_recipes(user_id,baby_id,cooked_at DESC);

CREATE TABLE public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  baby_id uuid NOT NULL, planned_for date NOT NULL, recipe_id text NOT NULL CHECK(length(recipe_id) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(baby_id,user_id) REFERENCES public.babies(id,user_id), UNIQUE(user_id,baby_id,planned_for)
);
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_baby_id uuid, onboarded boolean NOT NULL DEFAULT false,
  pantry text[] NOT NULL DEFAULT '{}', shopping_checked text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(selected_baby_id,user_id) REFERENCES public.babies(id,user_id),
  CHECK(cardinality(pantry)<=100 AND cardinality(shopping_checked)<=200)
);
CREATE TABLE public.product_events (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_name text NOT NULL CHECK(event_name IN ('onboarding_started','onboarding_completed','meal_suggestion_viewed','meal_selected','recipe_saved','meal_added_to_plan','meal_used_confirmed','meal_reused','return_session','premium_interest')),
  occurred_at timestamptz NOT NULL DEFAULT now(), properties jsonb NOT NULL DEFAULT '{}',
  is_test boolean NOT NULL DEFAULT false,
  CHECK(jsonb_typeof(properties)='object' AND properties-ARRAY['count','elapsedMs','price']='{}'::jsonb)
);
CREATE INDEX v2_events_user_time ON public.product_events(user_id,occurred_at DESC);
CREATE INDEX v2_events_real_cohorts ON public.product_events(event_name,occurred_at) WHERE NOT is_test;

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meal_plans,public.user_preferences,public.product_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.meal_plans,public.user_preferences TO authenticated;
GRANT SELECT,INSERT ON public.product_events TO authenticated;
CREATE POLICY v2_plan_owner ON public.meal_plans FOR ALL TO authenticated
  USING((select auth.uid())=user_id) WITH CHECK((select auth.uid())=user_id
    AND EXISTS(SELECT 1 FROM public.babies b WHERE b.id=baby_id AND b.user_id=(select auth.uid()) AND (b.birthdate IS NULL OR b.birthdate<=current_date-interval '6 months') AND coalesce(b.feeding_stage,CASE WHEN b.birthdate IS NOT NULL THEN 6 ELSE 0 END)>=6)
    AND NOT EXISTS(SELECT 1 FROM public.allergy_records a WHERE a.user_id=(select auth.uid()) AND (a.baby_id=meal_plans.baby_id OR a.baby_id IS NULL)));
CREATE POLICY v2_preferences_owner ON public.user_preferences FOR ALL TO authenticated
  USING((select auth.uid())=user_id) WITH CHECK((select auth.uid())=user_id);
CREATE POLICY v2_events_read ON public.product_events FOR SELECT TO authenticated USING((select auth.uid())=user_id);
CREATE POLICY v2_events_insert ON public.product_events FOR INSERT TO authenticated WITH CHECK((select auth.uid())=user_id);

CREATE OR REPLACE FUNCTION public.v2_event_clock() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  NEW.occurred_at=now();
  NEW.is_test=coalesce((auth.jwt()->'app_metadata'->>'is_test')::boolean,false);
  IF EXISTS(SELECT 1 FROM jsonb_each(NEW.properties) e WHERE jsonb_typeof(e.value)<>'number' OR (e.value::text)::numeric<0 OR (e.value::text)::numeric>86400000)
    THEN RAISE EXCEPTION 'invalid analytics properties' USING ERRCODE='22023'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER v2_event_clock BEFORE INSERT ON public.product_events FOR EACH ROW EXECUTE FUNCTION public.v2_event_clock();
CREATE OR REPLACE FUNCTION public.v2_confirmation_clock() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND (OLD.source='v2_confirmed' OR NEW.source IS DISTINCT FROM OLD.source) THEN
    RAISE EXCEPTION 'confirmation history is immutable; remove and reconfirm' USING ERRCODE='42501';
  END IF;
  IF NEW.source='v2_confirmed' THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() OR NOT EXISTS(SELECT 1 FROM public.babies b WHERE b.id=NEW.baby_id AND b.user_id=auth.uid() AND (b.birthdate IS NULL OR b.birthdate<=current_date-interval '6 months') AND coalesce(b.feeding_stage,CASE WHEN b.birthdate IS NOT NULL THEN 6 ELSE 0 END)>=6)
      THEN RAISE EXCEPTION 'child unavailable or preparation stage' USING ERRCODE='42501'; END IF;
    IF EXISTS(SELECT 1 FROM public.allergy_records a WHERE a.user_id=auth.uid() AND (a.baby_id=NEW.baby_id OR a.baby_id IS NULL))
      THEN RAISE EXCEPTION 'individual guidance required' USING ERRCODE='42501'; END IF;
    NEW.cooked_at=now(); NEW.action_recorded_at=now(); NEW.meal_day=(now() AT TIME ZONE 'Europe/Bucharest')::date;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER v2_confirmation_clock BEFORE INSERT OR UPDATE ON public.cooked_recipes FOR EACH ROW EXECUTE FUNCTION public.v2_confirmation_clock();
REVOKE ALL ON FUNCTION public.v2_event_clock(),public.v2_confirmation_clock() FROM PUBLIC,anon,authenticated;

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
    'selectedBabyId',child,
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

CREATE OR REPLACE FUNCTION public.v2_apply_action(p_baby_id uuid,p_action text,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE u uuid:=auth.uid(); r text:=p_payload->>'recipeId'; new_child uuid; v text; ids text[];
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
  IF p_action IN ('plan','confirm') AND EXISTS(SELECT 1 FROM public.allergy_records WHERE user_id=u AND (baby_id=p_baby_id OR baby_id IS NULL))
    THEN RAISE EXCEPTION 'individual guidance required' USING ERRCODE='42501'; END IF;
  IF p_action IN ('plan','confirm') AND (public.v2_load_state(p_baby_id)->>'stage')::smallint<6
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
    INSERT INTO public.meal_plans(user_id,baby_id,planned_for,recipe_id) VALUES(u,p_baby_id,(p_payload->>'slot')::date,r)
      ON CONFLICT(user_id,baby_id,planned_for) DO UPDATE SET recipe_id=excluded.recipe_id,updated_at=now();
  ELSIF p_action='remove-plan' THEN
    DELETE FROM public.meal_plans WHERE user_id=u AND baby_id=p_baby_id AND planned_for=(p_payload->>'slot')::date;
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

CREATE OR REPLACE FUNCTION public.v2_record_event(p_event_id uuid,p_name text,p_properties jsonb DEFAULT '{}') RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  INSERT INTO public.product_events(id,user_id,event_name,properties) VALUES(p_event_id,auth.uid(),p_name,p_properties) ON CONFLICT(id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.v2_load_state(uuid),public.v2_apply_action(uuid,text,jsonb),public.v2_record_event(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v2_load_state(uuid),public.v2_apply_action(uuid,text,jsonb),public.v2_record_event(uuid,text,jsonb) TO authenticated;
COMMIT;
