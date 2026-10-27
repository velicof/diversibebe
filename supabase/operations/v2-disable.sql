-- Operational rollback: disable new V2 RPCs only. Preserve data and security fixes.
-- Run first in the isolated stack. Production requires a separate release approval.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.v2_load_state(uuid),public.v2_apply_action(uuid,text,jsonb),public.v2_record_event(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.meal_plans,public.user_preferences,public.product_events FROM PUBLIC,anon,authenticated;
COMMIT;
