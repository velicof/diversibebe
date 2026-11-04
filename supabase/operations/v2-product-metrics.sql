-- Read-only aggregates for the monetization hypotheses (private beta). Test accounts excluded.
-- Counts of people and events only: no user ids, no child data, no free text. Cohorts under 5 people
-- are hidden so that a small beta cannot identify a family.
WITH events AS (
  SELECT user_id, event_name, properties, occurred_at
  FROM public.product_events
  WHERE NOT is_test AND occurred_at >= now() - interval '30 days'
), funnel AS (
  SELECT event_name AS metric, count(*)::int AS events, count(DISTINCT user_id)::int AS people
  FROM events
  WHERE event_name IN ('meal_suggestion_viewed','recipe_saved','meal_added_to_plan','shopping_list_generated','shopping_item_checked','meal_used_confirmed','premium_interest')
  GROUP BY event_name
), willingness AS (
  -- premium_interest.price: 19, 24 or 29 = would pay that much per month, 0 = would not pay,
  -- 25 and 69 = interest in the displayed offers, absent = interest from the planner.
  SELECT 'price_' || coalesce(properties->>'price', 'none') AS metric, count(*)::int AS events, count(DISTINCT user_id)::int AS people
  FROM events WHERE event_name = 'premium_interest'
  GROUP BY properties->>'price'
), returning_people AS (
  -- Came back on a later day within the window.
  SELECT 'returned_on_another_day' AS metric, count(*)::int AS events, count(*)::int AS people
  FROM (SELECT user_id FROM events WHERE event_name = 'return_session' GROUP BY user_id HAVING count(DISTINCT occurred_at::date) >= 2) r
)
SELECT metric,
       CASE WHEN people < 5 THEN NULL ELSE events END AS events,
       CASE WHEN people < 5 THEN NULL ELSE people END AS people
FROM (SELECT * FROM funnel UNION ALL SELECT * FROM willingness UNION ALL SELECT * FROM returning_people) m
ORDER BY metric;
