-- PREPARED LOCALLY. This does not reactivate AI or add paid calls.
BEGIN;
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS app_private.ai_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_day date NOT NULL,
  calls integer NOT NULL DEFAULT 0 CHECK(calls>=0),
  PRIMARY KEY(user_id,usage_day)
);
ALTER TABLE app_private.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_private.ai_usage FROM PUBLIC,anon,authenticated;
-- SECURITY DEFINER is narrowly required to access the private counter.
-- It accepts no user identity, checks auth.uid, pins search_path and has no dynamic SQL.
CREATE OR REPLACE FUNCTION public.consume_bebeasist_quota() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $quota$
DECLARE uid uuid := auth.uid(); accepted integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  INSERT INTO app_private.ai_usage(user_id,usage_day,calls)
    VALUES(uid,(now() AT TIME ZONE 'UTC')::date,1)
    ON CONFLICT(user_id,usage_day) DO UPDATE SET calls=app_private.ai_usage.calls+1
      WHERE app_private.ai_usage.calls<10
    RETURNING calls INTO accepted;
  RETURN accepted IS NOT NULL;
END $quota$;
REVOKE ALL ON FUNCTION public.consume_bebeasist_quota() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_bebeasist_quota() TO authenticated;
COMMIT;
