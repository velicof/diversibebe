-- Independent security hotfix, prepared only. No production execution authorized.
BEGIN;
REVOKE ALL PRIVILEGES ON TABLE public.user_login_summary FROM PUBLIC,anon,authenticated;
COMMIT;
