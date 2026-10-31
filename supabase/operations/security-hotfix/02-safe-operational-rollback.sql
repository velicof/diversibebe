-- Revert the view execution option while keeping public access closed.
-- Never restore the vulnerable public grants automatically.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='10s';
REVOKE ALL PRIVILEGES ON TABLE public.user_login_summary FROM PUBLIC,anon,authenticated;
ALTER VIEW public.user_login_summary RESET (security_invoker);
COMMIT;
