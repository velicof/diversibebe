-- Allergies filter recipes instead of switching planning off.
-- Until now one allergy anywhere in the account (V1 records them without a child) made the server refuse every
-- planned meal and every confirmation for every child. The app now leaves out, on the device, each recipe whose
-- written ingredients contain a recorded allergen (or cannot be verified), so the server only stops refusing
-- the whole family. The server does not know recipe ingredients: it never judged a recipe, only the family.
-- Nothing is deleted or rewritten: allergy_records, plans and confirmations keep their rows.
-- v2_load_state keeps reporting requiresClinicalGuidance (an allergy exists) for builds that still read it.
BEGIN;

-- Plans: ownership and the child's stage are still checked; an allergy in the account no longer blocks the row.
DROP POLICY IF EXISTS v2_plan_owner ON public.meal_plans;
CREATE POLICY v2_plan_owner ON public.meal_plans FOR ALL TO authenticated
  USING((select auth.uid())=user_id) WITH CHECK((select auth.uid())=user_id
    AND EXISTS(SELECT 1 FROM public.babies b WHERE b.id=baby_id AND b.user_id=(select auth.uid()) AND (b.birthdate IS NULL OR b.birthdate<=current_date-interval '6 months') AND coalesce(b.feeding_stage,CASE WHEN b.birthdate IS NOT NULL THEN 6 ELSE 0 END)>=6));

-- The two functions are edited in place: only the allergy refusal is removed, the rest of each body stays as
-- deployed. If the deployed body differs from the expected one, the migration stops instead of guessing.
DO $migration$
DECLARE
  fn regprocedure;
  def text;
  edited text;
  pattern text;
BEGIN
  fn := 'public.v2_apply_action(uuid,text,jsonb)'::regprocedure;
  def := pg_get_functiondef(fn);
  pattern := $re$\s*IF p_action IN \('plan','confirm'\) AND EXISTS\(SELECT 1 FROM public\.allergy_records WHERE user_id=u AND \(baby_id=p_baby_id OR baby_id IS NULL\)\)\s+THEN RAISE EXCEPTION 'individual guidance required' USING ERRCODE='42501'; END IF;$re$;
  edited := regexp_replace(def, pattern, '');
  IF edited = def OR position('individual guidance' IN edited) > 0 THEN
    RAISE EXCEPTION 'v2_apply_action: unexpected body, allergy refusal not found exactly once';
  END IF;
  EXECUTE edited;

  fn := 'public.v2_confirmation_clock()'::regprocedure;
  def := pg_get_functiondef(fn);
  pattern := $re$\s*IF EXISTS\(SELECT 1 FROM public\.allergy_records a WHERE a\.user_id=auth\.uid\(\) AND \(a\.baby_id=NEW\.baby_id OR a\.baby_id IS NULL\)\)\s+THEN RAISE EXCEPTION 'individual guidance required' USING ERRCODE='42501'; END IF;$re$;
  edited := regexp_replace(def, pattern, '');
  IF edited = def OR position('individual guidance' IN edited) > 0 THEN
    RAISE EXCEPTION 'v2_confirmation_clock: unexpected body, allergy refusal not found exactly once';
  END IF;
  EXECUTE edited;
END
$migration$;

-- CREATE OR REPLACE keeps the existing grants; restated so the result does not depend on that.
REVOKE ALL ON FUNCTION public.v2_confirmation_clock() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.v2_apply_action(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.v2_apply_action(uuid,text,jsonb) TO authenticated;
COMMIT;
