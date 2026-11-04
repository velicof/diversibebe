-- Adds one event name, so the private beta can tell "opened the shopping list" from "used it".
-- No rows change and properties stay limited to count, elapsedMs and price (the existing CHECK).
BEGIN;
ALTER TABLE public.product_events DROP CONSTRAINT IF EXISTS product_events_event_name_check;
ALTER TABLE public.product_events ADD CONSTRAINT product_events_event_name_check CHECK (event_name IN (
  'onboarding_started','onboarding_completed','meal_suggestion_viewed','meal_selected','recipe_saved',
  'meal_added_to_plan','meal_used_confirmed','meal_reused','return_session','premium_interest',
  'recipe_viewed','shopping_list_generated','shopping_item_checked'
));
COMMIT;
