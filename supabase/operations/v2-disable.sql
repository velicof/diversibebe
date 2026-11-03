-- Operational rollback: disable every V2 RPC and V2 table. Preserve data and security fixes.
-- V1 keeps working (tests/migration-rehearsal.test.cjs). Production requires a separate release approval.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $disable$
DECLARE f regprocedure;
BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE 'v2\_%'
  LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC,anon,authenticated',f); END LOOP;
END $disable$;
REVOKE ALL ON public.meal_plans,public.user_preferences,public.product_events FROM PUBLIC,anon,authenticated;
COMMIT;
