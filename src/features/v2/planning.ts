import type { Recipe } from "./catalog";
import type { PlanEntry } from "./model";
import { replacePlannedRecipe } from "@/app/lib/planSelection";
import { normalize } from "./review";

export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function nextDays(now: Date) {
  const start = dayKey(now);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(`${start}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("ro-RO", {
        weekday: "short",
        timeZone: "Europe/Bucharest",
      }).format(date),
      number: date.getUTCDate(),
    };
  });
}
export function weekRange(now: Date) {
  const start = new Date(`${dayKey(now)}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
export function nextAvailableSlot(plan: PlanEntry[], days: { key: string }[]) {
  return days.find((day) => !plan.some((p) => p.slot === day.key))?.key;
}
export function swapRecipe(
  eligible: Recipe[],
  plan: PlanEntry[],
  slot: string,
) {
  return replacePlannedRecipe(
    eligible,
    plan.find((p) => p.slot === slot)?.recipeId,
    plan.filter((p) => p.slot !== slot).map((p) => p.recipeId),
  );
}
/** De-duplicate exact ingredient lines only; never guess units or sum uncertain quantities. */
export function shoppingList(
  plan: PlanEntry[],
  recipes: Recipe[],
  pantry: string[],
) {
  const lines = new Map<
    string,
    { key: string; label: string; recipes: string[] }
  >();
  for (const slot of plan) {
    const recipe = recipes.find((r) => r.id === slot.recipeId);
    if (!recipe) continue;
    for (const label of recipe.ingredients) {
      if (
        pantry.some((id) => new RegExp(`\\b${id}\\w*`).test(normalize(label)))
      )
        continue;
      const key = normalize(label).trim();
      const row = lines.get(key) ?? { key, label, recipes: [] };
      row.recipes.push(recipe.name);
      lines.set(key, row);
    }
  }
  return [...lines.values()];
}
