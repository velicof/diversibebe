import type { EventName, LocalEvent, MealUse } from "./model";
const allowed: Record<EventName, string[]> = {
  onboarding_started: [],
  onboarding_completed: [],
  session_started: [],
  recommendation_results_shown: ["count"],
  first_relevant_choice: ["elapsedMs"],
  recipe_saved: [],
  plan_slot_saved: [],
  meal_confirmed: [],
  meal_reused: [],
  premium_interest: ["price"],
  meal_suggestion_viewed: ["count"],
  meal_selected: ["elapsedMs"],
  meal_added_to_plan: [],
  meal_used_confirmed: [],
  return_session: [],
  recipe_viewed: [],
  shopping_list_generated: ["count"],
  shopping_item_checked: [],
  plan_generated: ["count", "days", "meals"],
  plan_saved: ["count", "days", "meals"],
  plan_meal_replaced: [],
};
/** A strict allowlist: health fields, child names and arbitrary text never enter analytics. */
export function makeEvent(
  name: EventName,
  properties: Record<string, unknown>,
  at: string,
  id: string,
): LocalEvent {
  const safe: LocalEvent["properties"] = {};
  for (const key of allowed[name]) {
    const value = properties[key];
    if (
      ["count", "elapsedMs", "price", "days", "meals"].includes(key) &&
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
    )
      safe[key] = Math.round(value);
  }
  const aliases: Partial<Record<EventName, EventName>> = {
    session_started: "return_session",
    recommendation_results_shown: "meal_suggestion_viewed",
    first_relevant_choice: "meal_selected",
    plan_slot_saved: "meal_added_to_plan",
    meal_confirmed: "meal_used_confirmed",
  };
  return { id, name: aliases[name] ?? name, at, properties: safe };
}
export function weeklyUsage(uses: MealUse[], start: string, end: string) {
  const selected = uses.filter(
    (u) =>
      u.day >= start &&
      u.day <= end &&
      (!u.source || u.source === "v2_confirmed"),
  );
  const count = new Set(selected.map((u) => `${u.recipeId}:${u.day}`)).size;
  const days = new Set(selected.map((u) => u.day)).size;
  return { count, days, northStar: count >= 3 && days >= 2 };
}
