-- READ ONLY. Activation, planner use, shopping list use, return after 7 and 30 days, Premium interest
-- (docs/product/BUSINESS-VALIDATION.md §3). Accounts only (visitors send nothing), test accounts excluded.
-- People and event counts only: no user id, child, recipe or text leaves the query. Any cohort under 5
-- people is hidden. Needs 20261113100000_v2_flexible_planner.sql (plan_generated / plan_saved events).
BEGIN TRANSACTION READ ONLY;
WITH events AS (
  SELECT user_id, event_name, properties, occurred_at
  FROM public.product_events WHERE NOT is_test
), first_seen AS (
  -- An account's start: its first event of any kind.
  SELECT user_id, min(occurred_at) AS started FROM events GROUP BY user_id
), meal_actions AS (
  SELECT user_id, occurred_at FROM events
  WHERE event_name IN ('meal_added_to_plan','plan_saved','meal_used_confirmed','shopping_item_checked')
), cohort AS (
  SELECT f.user_id, f.started,
    -- Activation: a plan saved or a meal marked as cooked within 24 h of starting.
    EXISTS(SELECT 1 FROM events e WHERE e.user_id=f.user_id AND e.event_name IN ('meal_added_to_plan','plan_saved','meal_used_confirmed')
      AND e.occurred_at < f.started + interval '24 hours') AS activated,
    EXISTS(SELECT 1 FROM events e WHERE e.user_id=f.user_id AND e.event_name='plan_generated') AS generated,
    EXISTS(SELECT 1 FROM events e WHERE e.user_id=f.user_id AND e.event_name='plan_saved') AS saved_plan,
    EXISTS(SELECT 1 FROM events e WHERE e.user_id=f.user_id AND e.event_name IN ('shopping_list_generated','shopping_item_checked')) AS used_list,
    -- Return: a meal action on days 6-8 (Z7) or 28-32 (Z30) after starting.
    EXISTS(SELECT 1 FROM meal_actions m WHERE m.user_id=f.user_id AND m.occurred_at >= f.started + interval '6 days' AND m.occurred_at < f.started + interval '9 days') AS d7,
    EXISTS(SELECT 1 FROM meal_actions m WHERE m.user_id=f.user_id AND m.occurred_at >= f.started + interval '28 days' AND m.occurred_at < f.started + interval '33 days') AS d30,
    EXISTS(SELECT 1 FROM events e WHERE e.user_id=f.user_id AND e.event_name='premium_interest' AND coalesce((e.properties->>'price')::int,1)<>0) AS would_pay,
    f.started <= now() - interval '9 days' AS d7_due,
    f.started <= now() - interval '33 days' AS d30_due
  FROM first_seen f
), metrics AS (
  SELECT 'accounts_started' AS metric, count(*)::int AS people, NULL::numeric AS rate FROM cohort
  UNION ALL SELECT 'activated_24h', count(*) FILTER (WHERE activated), round(100.0*count(*) FILTER (WHERE activated)/nullif(count(*),0),1) FROM cohort
  UNION ALL SELECT 'generated_a_plan', count(*) FILTER (WHERE generated), round(100.0*count(*) FILTER (WHERE generated)/nullif(count(*),0),1) FROM cohort
  UNION ALL SELECT 'saved_a_plan', count(*) FILTER (WHERE saved_plan), round(100.0*count(*) FILTER (WHERE saved_plan)/nullif(count(*),0),1) FROM cohort
  UNION ALL SELECT 'used_shopping_list', count(*) FILTER (WHERE used_list), round(100.0*count(*) FILTER (WHERE used_list)/nullif(count(*),0),1) FROM cohort
  UNION ALL SELECT 'returned_day_7 (of accounts started 9+ days ago)', count(*) FILTER (WHERE d7 AND d7_due), round(100.0*count(*) FILTER (WHERE d7 AND d7_due)/nullif(count(*) FILTER (WHERE d7_due),0),1) FROM cohort
  UNION ALL SELECT 'returned_day_30 (of accounts started 33+ days ago)', count(*) FILTER (WHERE d30 AND d30_due), round(100.0*count(*) FILTER (WHERE d30 AND d30_due)/nullif(count(*) FILTER (WHERE d30_due),0),1) FROM cohort
  UNION ALL SELECT 'premium_interest_at_a_price', count(*) FILTER (WHERE would_pay), round(100.0*count(*) FILTER (WHERE would_pay)/nullif(count(*),0),1) FROM cohort
  UNION ALL SELECT 'plans_generated (events)', (SELECT count(*)::int FROM events WHERE event_name='plan_generated'), NULL
  UNION ALL SELECT 'meals_per_saved_plan (median)', (SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY (properties->>'count')::int) FROM events WHERE event_name='plan_saved'), NULL
  UNION ALL SELECT 'days_per_saved_plan (median)', (SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY (properties->>'days')::int) FROM events WHERE event_name='plan_saved'), NULL
)
SELECT metric, CASE WHEN (SELECT count(*) FROM cohort) < 5 THEN NULL ELSE people END AS people,
       CASE WHEN (SELECT count(*) FROM cohort) < 5 THEN NULL ELSE rate END AS percent
FROM metrics;
ROLLBACK;
