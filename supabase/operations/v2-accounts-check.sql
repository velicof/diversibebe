-- READ ONLY. Aggregate health of the existing accounts before (and after) the V2 release: can every account
-- sign in to V2, and with what. Counts only: no email, name or id leaves the database.
BEGIN TRANSACTION READ ONLY;
SELECT jsonb_build_object(
  'accounts', (SELECT count(*) FROM auth.users),
  'deleted_or_banned', (SELECT count(*) FROM auth.users WHERE deleted_at IS NOT NULL OR banned_until > now()),
  'email_confirmed', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
  'with_password', (SELECT count(*) FROM auth.users WHERE coalesce(encrypted_password, '') <> ''),
  'google_identity', (SELECT count(DISTINCT user_id) FROM auth.identities WHERE provider = 'google'),
  'google_only_no_password', (SELECT count(*) FROM auth.users u WHERE coalesce(u.encrypted_password, '') = ''
      AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'google')),
  'email_identity', (SELECT count(DISTINCT user_id) FROM auth.identities WHERE provider = 'email'),
  'no_identity', (SELECT count(*) FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id)),
  'without_profile', (SELECT count(*) FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)),
  'profile_without_account', (SELECT count(*) FROM public.profiles p WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)),
  'duplicate_emails_ci', (SELECT count(*) FROM (SELECT lower(email) FROM auth.users GROUP BY 1 HAVING count(*) > 1) d),
  'children_per_account', (SELECT jsonb_object_agg(k, n) FROM (SELECT k, count(*) n FROM (SELECT (SELECT count(*) FROM public.babies b WHERE b.user_id = u.id) k FROM auth.users u) x GROUP BY k) y),
  'children_without_birthdate', (SELECT count(*) FROM public.babies WHERE birthdate IS NULL),
  'children_stage_from_birthdate', (SELECT jsonb_object_agg(stage, n) FROM (SELECT CASE WHEN birthdate > current_date - interval '6 months' THEN 'sub 6 luni'
      WHEN birthdate > current_date - interval '8 months' THEN '6-7' WHEN birthdate > current_date - interval '10 months' THEN '8-9'
      WHEN birthdate > current_date - interval '12 months' THEN '10-11' WHEN birthdate > current_date - interval '24 months' THEN '12-23' ELSE '24+' END stage, count(*) n
      FROM public.babies GROUP BY 1) s),
  'signed_in_last_30_days', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '30 days'),
  'signed_in_last_90_days', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '90 days')
) AS accounts;
ROLLBACK;
