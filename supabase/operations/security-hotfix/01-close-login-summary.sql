-- Independent production hotfix. PREPARED ONLY; founder approval required.
-- PostgreSQL 17, verified using metadata only on 2026-10-30.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='10s';
REVOKE ALL PRIVILEGES ON TABLE public.user_login_summary FROM PUBLIC,anon,authenticated;
ALTER VIEW public.user_login_summary SET (security_invoker=true);
COMMIT;
