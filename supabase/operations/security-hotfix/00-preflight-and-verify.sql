-- Metadata only. Does not read profiles, login events or view rows.
SELECT n.nspname,c.relname,pg_get_userbyid(c.relowner) AS owner_role,c.reloptions,
  has_table_privilege('anon',c.oid,'SELECT') AS anon_can_select,
  has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_can_select,
  has_table_privilege(pg_get_userbyid(c.relowner),c.oid,'SELECT') AS owner_can_select
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='user_login_summary';
SELECT grantee,privilege_type FROM information_schema.role_table_grants
WHERE table_schema='public' AND table_name='user_login_summary' ORDER BY grantee,privilege_type;
